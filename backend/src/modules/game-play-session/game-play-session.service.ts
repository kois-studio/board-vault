import { Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ResultSet } from '@libsql/client/.'
import { CreateGamePlaySessionBody, GamePlaySessionDto } from '../../common/types/game-play-session.type'
import { gamePlaySessionsSchema } from '../../common/schemas/db-game-play-session.schema'

@Injectable()
export class GamePlaySessionService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<GamePlaySessionDto> {
        console.log(resultSet)
        const gamePlaySessions = resultSet.rows.map(row => ({
            id: Number(row[0]),
            accountId: Number(row[1]),
            gameId: Number(row[2]),
            createdAt: String(row[3]),
        }))

        const result = gamePlaySessionsSchema.safeParse(gamePlaySessions)

        if (!result.success) {
            this.LOGGER.error('Failed to parse gamePlaySessions from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getGamePlaySessions(): Promise<Array<GamePlaySessionDto>> {
        this.LOGGER.log('Getting all gamePlaySessions')
        const resultSet = await this.databaseService.getGamePlaySession()

        return this._parseResultSet(resultSet)
    }

    async getGamePlaySessionById(accountId: number, gameId: number): Promise<Array<GamePlaySessionDto>> {
        this.LOGGER.log(`Getting GamePlaySession with id ${accountId} ${gameId}`)
        const resultSet = await this.databaseService.getGamePlaySessionById(accountId, gameId)
        const gamePlaySession = this._parseResultSet(resultSet)

        if (gamePlaySession.length === 0) {
            throw new NotFoundException(`GamePlaySession with id ${accountId} ${gameId} not found`)
        }

        return gamePlaySession
    }

    async createGamePlaySession(gamePlaySessionBody: CreateGamePlaySessionBody) {
        this.LOGGER.log(`Creating gamePlaySesion ${gamePlaySessionBody.accountId} - ${gamePlaySessionBody.gameId}`)
        try {
            await this.databaseService.createGamePlaySession(gamePlaySessionBody)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Failed to create gamePlay Session', error)
            throw new InternalServerErrorException('Failed to create gamePlay Session')
        }
    }

    async deleteGamePlaySessionById(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting gamePlay Session with id ${id}`)
        const resultSet = await this.databaseService.deleteGamePlaySessionById(id)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`GamePlay Session with id ${id} not found`)
        }

        return { success: true }
    }
}
