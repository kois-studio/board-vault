import { ResultSet } from '@libsql/client/.'
import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { gamesSchema } from '../../../common/schemas'
import { CreateGameBody, GameDto, UpdateGameBody } from '../../../common/types/game.type'
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
            title: String(row[1]),
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

    async getGames(): Promise<Array<GameDto>> {
        this.LOGGER.log('Getting all games')
        const resultSet = await this.databaseService.getGames()

        return this._parseResultSet(resultSet)
    }

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

    async createGame(gameDto: CreateGameBody) {
        this.LOGGER.log(`Creating game ${gameDto.title}`)
        try {
            await this.databaseService.createGame(gameDto)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to create game', error)
            throw new ConflictException('Game title already in use')
        }
    }

    async deleteGameById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting game with id ${id}`)
        const resultSet = await this.databaseService.deleteGameById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Game with id ${id} not found`)
        }

        return { success: true }
    }

    async updateGame(id: number, partialGameDto: UpdateGameBody): Promise<{ success: boolean }> {
        this.LOGGER.log(`Updating game with id ${id}`)
        const resultSet = await this.databaseService.updateGame(id, partialGameDto)

        if (resultSet.rows.length === 0) {
            throw new NotFoundException(`Game with id ${id} not found`)
        }

        return { success: true }
    }
}
