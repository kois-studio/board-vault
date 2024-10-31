import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { meetGamesSchema } from '../../common/schemas/db-meet-game.schema'
import { MeetGameDto } from '../../common/types/meet-game.type'

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
}
