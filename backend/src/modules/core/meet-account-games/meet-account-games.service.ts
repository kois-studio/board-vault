import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../../common/database/database.service'
import { meetAccountGamesSchema } from '../../../common/schemas/db-meet-account-game.schema'
import { MeetAccountGameDto } from '../../../common/types/meet-account-game.type'

@Injectable()
export class MeetAccountGamesService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<MeetAccountGameDto> {
        const meetAccountGames = resultSet.rows.map(row => ({
            meetId: Number(row[0]),
            accountId: Number(row[1]),
            gameId: Number(row[2]),
        }))
        
        return this._validateSchema(meetAccountGames)
    }

    private _validateSchema(meetAccountGames: Array<MeetAccountGameDto>): Array<MeetAccountGameDto> {
        const result = meetAccountGamesSchema.safeParse(meetAccountGames)

        if (!result.success) {
            this.LOGGER.error('Failed to parse MeetAccountGames from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    // #region methods

    async getMeetAccountGamesBy(config: {
        accountId?: number
        meetId?: number
        gameId?: number
    }): Promise<Array<MeetAccountGameDto>> {
        this.LOGGER.log(`Getting meetAccountGames by accountId ${config.accountId} meetId ${config.meetId} gameId ${config.gameId}`)
        const resultSet = await this.databaseService.getMeetAccountGamesBy(config)
        return this._parseResultSet(resultSet)
    }

    async createMeetAccountGame(accountId: number, meetId: number, gameId: number): Promise<MeetAccountGameDto> {
        this.LOGGER.log(`Creating meetAccountGame with accountId ${accountId}, meetId ${meetId} and gameId ${gameId}`)
        const resultSet = await this.databaseService.createMeetAccountGame(accountId, meetId, gameId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Meet with meetId ${meetId} not found`)
        }

        return this._parseResultSet(resultSet)[0]
    }

    async deleteMeetAccountGame(accountId: number, meetId: number, gameId: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting meetAccountGame with accountId ${accountId}, meetId ${meetId} and gameId ${gameId}`)
        const resultSet = await this.databaseService.deleteMeetAccountGame(accountId, meetId, gameId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Meet with meetId ${meetId} not found`)
        }

        return { success: true }
    }
}
