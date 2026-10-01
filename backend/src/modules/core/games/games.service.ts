import { ResultSet } from '@libsql/client'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { safeErrorName } from '../../../common/logging/structured-log'
import { gamesSchema } from '../../../common/schemas'
import { GameDto } from '../../../common/types/game.type'
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
            imageUrl: String(row[1]),
            gameAvgDuration: Number(row[2]),
            minPlayers: Number(row[3]),
            maxPlayers: Number(row[4]),
        }))

        return this._validateSchema(games)
    }

    private _validateSchema(games: Array<GameDto>): Array<GameDto> {
        const result = gamesSchema.safeParse(games)

        if (!result.success) {
            this.LOGGER.error('Failed to parse games from database')
            return []
        }

        return result.data
    }

    // #region methods

    async getGameById(id: number): Promise<GameDto> {
        this.LOGGER.log('Getting game by id')

        // Step 1: Try to get them from cache
        const cachedGame = await this.cacheService.get(`${this.CACHE_KEY}:byId:${id}`)

        if (cachedGame) {
            this.LOGGER.log('Returning cached game')
            return this._validateSchema([cachedGame])[0]
        }

        // Step 2: If no cached, get them from database
        const resultSet = await this.databaseService.games.getGameById(id)
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
            this.LOGGER.error(`Failed to get safe game by id (${safeErrorName(error)})`)
            return null
        }
    }

    async getGames(): Promise<Array<GameDto>> {
        this.LOGGER.log('Getting all games')

        const resultSet = await this.databaseService.games.getGames()
        const games = this._parseResultSet(resultSet)

        return games
    }

    async createGame(gameData: {
        title: string
        imageUrl: string
        gameAvgDuration: number
        minPlayers: number
        maxPlayers: number
    }): Promise<GameDto> {
        this.LOGGER.log('Creating game')

        await this.databaseService.games.createGame(gameData)

        // Get the created game to return it
        const resultSet = await this.databaseService.games.getGames()
        const games = this._parseResultSet(resultSet)

        // Return the most recent one (should be the one we just created)
        const createdGame = games[games.length - 1]

        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:all`)

        return createdGame
    }
}
