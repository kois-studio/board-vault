import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger } from '@nestjs/common'

import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'

import { gameTranslationsSchema } from './game-translation.schema'

import type { SuccessDto } from '../../../common/types/auth.type'
import type { GameTranslationDto, SupportedLanguage } from '../../../common/types/game-translation.type'
import type { BrowseGamesPaginationDto } from '../../../common/types/game.type'

@Injectable()
export class GameTranslationService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly CACHE_KEY = 'game-translation'

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<GameTranslationDto> {
        const gameTranslations = resultSet.rows.map(row => ({
            gameId: Number(row[0]),
            languageCode: String(row[1]) as SupportedLanguage,
            title: String(row[2]),
            normalizedTitle: String(row[3]),
        }))

        return this._validateSchema(gameTranslations)
    }

    private _validateSchema(gameTranslations: Array<GameTranslationDto>): Array<GameTranslationDto> {
        const result = gameTranslationsSchema.safeParse(gameTranslations)

        if (!result.success) {
            this.LOGGER.error('Failed to parse GameTranslations from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    private _normalizeTitle(title: string): string {
        return title
            .toLowerCase()
            .normalize('NFD') // decompose accented characters
            .replace(/[\u0300-\u036f]/g, '') // remove accent marks
            .replace(/[^\w\s-]/g, '') // remove all non-alphanumeric except spaces and hyphens
            .trim() // remove leading/trailing spaces
            .replace(/\s+/g, '-') // replace spaces with hyphens for better readability
    }

    private _reduceGameTranslations(gameTranslations: Array<GameTranslationDto>): Record<SupportedLanguage, string> {
        return gameTranslations.reduce(
            (acc, translation) => {
                acc[translation.languageCode] = translation.title
                return acc
            },
            { en: '', es: '' } as Record<SupportedLanguage, string>,
        )
    }

    // --------------------------------------------------------------------------
    //        Methods
    // --------------------------------------------------------------------------

    async getGameTranslations(gameId: number): Promise<Record<SupportedLanguage, string>> {
        this.LOGGER.log(`Getting translations for game ${gameId}`)

        // Step 1: Try to get them from cache
        const cachedGameTranslations = await this.cacheService.get(`${this.CACHE_KEY}:byGameId:${gameId}`)

        if (cachedGameTranslations) {
            this.LOGGER.log(`Returning cached translations for game ${gameId}`)
            const gameTranslations = this._validateSchema(cachedGameTranslations)

            return this._reduceGameTranslations(gameTranslations)
        }

        // Step 2: If no cached, get them from database
        const resultSet = await this.databaseService.getGameTranslations(gameId)
        const gameTranslations = this._parseResultSet(resultSet)

        // Step 3: Save them to cache
        await this.cacheService.set(`${this.CACHE_KEY}:byGameId:${gameId}`, gameTranslations)

        return this._reduceGameTranslations(gameTranslations)
    }

    async createGameTranslation(gameId: number, languageCode: string, title: string): Promise<SuccessDto> {
        this.LOGGER.log(`Creating translation for game ${gameId}`)

        const normalizedTitle = this._normalizeTitle(title)

        await this.databaseService.createGameTranslation(gameId, languageCode, title, normalizedTitle)

        // Step 4: Invalidate cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byGameId:${gameId}`)

        return { success: true }
    }

    async upsertGameTranslation(gameId: number, languageCode: string, title: string): Promise<SuccessDto> {
        this.LOGGER.log(`Upserting translation for game ${gameId}`)

        const normalizedTitle = this._normalizeTitle(title)

        await this.databaseService.upsertGameTranslation(gameId, languageCode, title, normalizedTitle)

        // Step 4: Invalidate cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byGameId:${gameId}`)

        return { success: true }
    }

    async browseGamesByTitle(options: {
        search: string
        page: number
        pageSize: number
        excludeGameIds: number[]
    }): Promise<BrowseGamesPaginationDto & { gameIds: number[] }> {
        this.LOGGER.log(
            `Browsing games with search: "${options.search}", page: ${options.page}, pageSize: ${options.pageSize}, excludeGameIds: ${options.excludeGameIds.join(',')}`,
        )

        // Calculate skip based on page and pageSize
        const skip = (options.page - 1) * options.pageSize
        const normalizedSearch = this._normalizeTitle(options.search)

        // Step 1: Try to get from cache if it's a simple query
        const cacheKey = `${this.CACHE_KEY}:browse:${normalizedSearch}:${options.page}:${options.pageSize}:${options.excludeGameIds.join(',')}`

        const cachedResult = await this.cacheService.get(cacheKey)

        if (cachedResult) {
            this.LOGGER.log(`Returning cached browse games result for "${normalizedSearch}"`)
            return cachedResult
        }

        // Step 2: Get games and total count from database
        const [gamesResult, countResult] = await Promise.all([
            this.databaseService.browseGames({
                search: normalizedSearch,
                skip,
                take: options.pageSize,
                excludeGameIds: options.excludeGameIds,
                languageCode: 'en',
            }),
            this.databaseService.countGames({
                search: normalizedSearch,
                excludeGameIds: options.excludeGameIds,
                languageCode: 'en',
            }),
        ])

        // Parse and validate the results
        const gameTranslations = this._parseResultSet(gamesResult)
        const total = Number(countResult.rows[0].total)

        // Calculate total pages
        const totalPages = Math.ceil(total / options.pageSize)

        // Create the result object
        const result: BrowseGamesPaginationDto & { gameIds: number[] } = {
            gameIds: gameTranslations.map(gameTranslation => gameTranslation.gameId),
            currentPage: options.page,
            totalPages,
            totalItems: total,
            itemsPerPage: options.pageSize,
        }

        // Step 3: Save to cache
        await this.cacheService.set(cacheKey, result, 'long')

        return result
    }

    async browseGamesByTitleMultiLanguage(options: {
        search: string
        page: number
        pageSize: number
        excludeGameIds: number[]
    }): Promise<BrowseGamesPaginationDto & { gameIds: number[] }> {
        this.LOGGER.log(
            `Browsing games with multi-language search: "${options.search}", page: ${options.page}, pageSize: ${options.pageSize}, excludeGameIds: ${options.excludeGameIds.join(',')}`,
        )

        // Calculate skip based on page and pageSize
        const skip = (options.page - 1) * options.pageSize
        const normalizedSearch = this._normalizeTitle(options.search)

        // Step 1: Try to get from cache if it's a simple query
        const cacheKey = `${this.CACHE_KEY}:browseMultiLang:${normalizedSearch}:${options.page}:${options.pageSize}:${options.excludeGameIds.join(',')}`

        const cachedResult = await this.cacheService.get(cacheKey)

        if (cachedResult) {
            this.LOGGER.log(`Returning cached multi-language browse games result for "${normalizedSearch}"`)
            return cachedResult
        }

        // Step 2: Get games and total count from database
        const [gamesResult, countResult] = await Promise.all([
            this.databaseService.browseGamesMultiLanguage({
                search: normalizedSearch,
                skip,
                take: options.pageSize,
                excludeGameIds: options.excludeGameIds,
            }),
            this.databaseService.countGamesMultiLanguage({
                search: normalizedSearch,
                excludeGameIds: options.excludeGameIds,
            }),
        ])

        // Parse the results - gamesResult now returns gameIds directly
        const gameIds = gamesResult.rows.map(row => Number(row[0]))
        const total = Number(countResult.rows[0].total)

        // Calculate total pages
        const totalPages = Math.ceil(total / options.pageSize)

        // Create the result object
        const result: BrowseGamesPaginationDto & { gameIds: number[] } = {
            gameIds,
            currentPage: options.page,
            totalPages,
            totalItems: total,
            itemsPerPage: options.pageSize,
        }

        // Step 3: Save to cache
        await this.cacheService.set(cacheKey, result, 'long')

        return result
    }
}
