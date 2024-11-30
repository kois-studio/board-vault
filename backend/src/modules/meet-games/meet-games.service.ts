import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { meetGamesSchema } from '../../common/schemas/db-meet-game.schema'
import { MeetGameDto, UpdateMeetGameBody } from '../../common/types/meet-game.type'

@Injectable()
export class MeetGamesService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<MeetGameDto> {
        const meetGames = resultSet.rows.map(row => ({
            meetId: Number(row[0]),
            gameId: Number(row[1]),
            isPlayed: Boolean(row[2]),
        }))

        const result = meetGamesSchema.safeParse(meetGames)

        if (!result.success) {
            this.LOGGER.error('Failed to parse meet games from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getMeetGames(): Promise<Array<MeetGameDto>> {
        this.LOGGER.log('Getting all meet games')
        const resultSet = await this.databaseService.getMeetGames()

        return this._parseResultSet(resultSet)
    }

    async getMeetGameByMeetId(meetId: number): Promise<Array<MeetGameDto>> {
        this.LOGGER.log(`Getting meetGame with meetId ${meetId}`)
        const resultSet = await this.databaseService.getMeetGameByMeetId(meetId)
        const meetGames = this._parseResultSet(resultSet)

        if (meetGames.length === 0) {
            throw new NotFoundException(`MeetGame with meetId ${meetId} not found`)
        }

        return meetGames
    }

    async updateMeetGame(meetId: number, gameId: number, partialMeetGame: UpdateMeetGameBody): Promise<{ success: boolean }> {
        this.LOGGER.log(`Updating meetGame with gameId ${gameId} and meetId ${meetId} to ${partialMeetGame}`)
        const resultSet = await this.databaseService.updateMeetGame(meetId, gameId, partialMeetGame)

        if (resultSet.rows.length === 0) {
            throw new NotFoundException(`Meet with meetId ${meetId} not found`)
        }

        return { success: true }
    }
}
