import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ResultSet } from '@libsql/client/.'
import { CreateGameBody, GameDto, UpdateGameBody } from '../../common/types/game.type'
import { gamesSchema } from '../../common/schemas'

@Injectable()
export class GamesService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<GameDto> {
        const games = resultSet.rows.map(row => ({
            id: Number(row[0]),
            title: String(row[1]),
            imageUrl: String(row[2]),
            gameAvgDuration: Number(row[3]),
            minPlayers: Number(row[4]),
            maxPlayers: Number(row[5]),
        }))

        const result = gamesSchema.safeParse(games)

        if (!result.success) {
            this.LOGGER.error('Failed to parse games from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getGames(): Promise<Array<GameDto>> {
        this.LOGGER.log('Getting all games')
        const resultSet = await this.databaseService.getGames()

        return this._parseResultSet(resultSet)
    }

    async getGameById(id: number): Promise<GameDto | NotFoundException> {
        this.LOGGER.log(`Getting game with id ${id}`)
        const resultSet = await this.databaseService.getGameById(id)
        const games = this._parseResultSet(resultSet)

        if (games.length === 0) {
            return new NotFoundException(`Game with id ${id} not found`)
        }
        return games[0]
    }

    async createGame(gameDto: CreateGameBody) {
        this.LOGGER.log(`Creating game ${gameDto.title}`)
        try {
            await this.databaseService.createGame(gameDto)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to create game', error)
            return new ConflictException('Game title already in use')
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
