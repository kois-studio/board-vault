import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger } from '@nestjs/common'

import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'
import type { GameTranslationDto } from '../../../common/types/game-translation.type'
import { gameTranslationsSchema } from './game-translation.schema'
import type { SuccessDto } from '../../../common/types/auth.type'

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
            languageCode: String(row[1]),
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

    async getGameTranslations(gameId: number): Promise<Array<GameTranslationDto>> {
        this.LOGGER.log(`Getting translations for game ${gameId}`)

        // Step 1: Try to get them from cache
        const cachedGameTranslations = await this.cacheService.get(`${this.CACHE_KEY}:byGameId:${gameId}`)

        if (cachedGameTranslations) {
            this.LOGGER.log(`Returning cached translations for game ${gameId}`)
            return this._validateSchema(cachedGameTranslations)
        }

        // Step 2: If no cached, get them from database
        const resultSet = await this.databaseService.getGameTranslations(gameId)
        const gameTranslations = this._parseResultSet(resultSet)

        // Step 3: Save them to cache
        await this.cacheService.set(`${this.CACHE_KEY}:byGameId:${gameId}`, gameTranslations)

        return gameTranslations
    }

    async createGameTranslation(gameId: number, languageCode: string, title: string, normalizedTitle: string): Promise<SuccessDto> {
        this.LOGGER.log(`Creating translation for game ${gameId}`)

        await this.databaseService.createGameTranslation(gameId, languageCode, title, normalizedTitle)

        // Step 4: Invalidate cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byGameId:${gameId}`)

        return { success: true }
    }
}
