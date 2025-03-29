import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { gamesSchema } from '../../../common/schemas'
import { BrowseGamesPaginationDto, GameDto } from '../../../common/types/game.type'
import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'

@Injectable()
export class GamesService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly CACHE_KEY = 'games'

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<GameDto> {
        const games = resultSet.rows.map(row => ({
            id: Number(row[0]),
            // title: String(row[1]),
            imageUrl: String(row[2]),
            gameAvgDuration: Number(row[3]),
            minPlayers: Number(row[4]),
            maxPlayers: Number(row[5]),
        }))

        return this._validateSchema(games)
    }

    private _validateSchema(games: Array<GameDto>): Array<GameDto> {
        const result = gamesSchema.safeParse(games)

        if (!result.success) {
            this.LOGGER.error('Failed to parse games from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    // #region methods

    async getGameById(id: number): Promise<GameDto> {
        this.LOGGER.log(`Getting game by id ${id}`)

        // Step 1: Try to get them from cache
        const cachedGame = await this.cacheService.get(`${this.CACHE_KEY}:byId:${id}`)

        if (cachedGame) {
            this.LOGGER.log(`Returning cached game by id ${id}`)
            return this._validateSchema([cachedGame])[0]
        }

        // Step 2: If no cached, get them from database
        const resultSet = await this.databaseService.getGameById(id)
        const games = this._parseResultSet(resultSet)

        if (games.length === 0) {
            throw new NotFoundException(`Game with id ${id} not found`)
        }

        // Step 3: Save them to cache
        await this.cacheService.set(`${this.CACHE_KEY}:byId:${id}`, games[0])
        return games[0]
    }

    async getSafeGameById(id: number): Promise<null | GameDto> {
        try {
            return await this.getGameById(id)
        } catch (error) {
            this.LOGGER.error('Failed to get safe game by id', error)
            return null
        }
    }

    async browseGames(options: {
        search?: string
        page?: number
        pageSize?: number
        excludeGameIds?: number[]
    }): Promise<BrowseGamesPaginationDto & { games: Array<GameDto> }> {
        const { search = '', page = 1, pageSize = 20, excludeGameIds = [] } = options

        this.LOGGER.log(`Browsing games with search: "${search}", page: ${page}, pageSize: ${pageSize}`)

        // Calculate skip based on page and pageSize
        const skip = (page - 1) * pageSize

        // Step 1: Try to get from cache if it's a simple query
        const cacheKey = `${this.CACHE_KEY}:browse:${search}:${page}:${pageSize}:${excludeGameIds.join(',')}`

        const cachedResult = await this.cacheService.get(cacheKey)

        if (cachedResult) {
            this.LOGGER.log(`Returning cached browse games result for "${search}"`)
            return cachedResult
        }

        // Step 2: Get games and total count from database
        const [gamesResult, countResult] = await Promise.all([
            this.databaseService.browseGames({
                search,
                skip,
                take: pageSize,
                excludeGameIds,
            }),
            this.databaseService.countGames({
                search,
                excludeGameIds,
            }),
        ])

        // Parse and validate the results
        const games = this._parseResultSet(gamesResult)
        const total = Number(countResult.rows[0].total)

        // Calculate total pages
        const totalPages = Math.ceil(total / pageSize)

        // Create the result object
        const result: BrowseGamesPaginationDto & { games: Array<GameDto> } = {
            games,
            currentPage: page,
            totalPages,
            totalItems: total,
            itemsPerPage: pageSize,
        }

        // Step 3: Save to cache with a reasonable TTL (e.g., 5 minutes)
        await this.cacheService.set(cacheKey, result, 5 * 60)

        return result
    }
}
