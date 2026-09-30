import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { mapMeetDetailsResult } from '../../../common/mappers/meet-details.mapper'
import { meetsSchema } from '../../../common/schemas/db-meet.schema'
import { MeetDto, MeetWithAttendeesAndGames } from '../../../common/types/meet.type'
import { DatabaseService } from '../../common/database/database.service'

@Injectable()
export class MeetsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<MeetDto> {
        const meets = resultSet.rows.map(row => ({
            id: Number(row[0]),
            groupId: Number(row[1]),
            createdBy: Number(row[2]),
            meetDate: String(row[3]),
            isConfirmed: Boolean(row[4]),
            status: String(row[5] ?? 'completed') as MeetDto['status'],
            timezone: String(row[6] ?? 'UTC'),
            notes: row[7] == null ? null : String(row[7]),
        }))

        const result = meetsSchema.safeParse(meets)

        if (!result.success) {
            this.LOGGER.error('Failed to parse meets from database')
            return []
        }

        return result.data
    }

    async getMeetsForAccount(accountId: number): Promise<Array<MeetDto>> {
        this.LOGGER.log('Getting meetings for account')
        const resultSet = await this.databaseService.sessions.getMeetsForAccount(accountId)

        return this._parseResultSet(resultSet)
    }

    async getMeetById(id: number, accountId: number): Promise<MeetDto> {
        this.LOGGER.log('Getting meeting by id')
        const resultSet = await this.databaseService.sessions.getMeetByIdForAccount(id, accountId)
        const meets = this._parseResultSet(resultSet)

        if (meets.length === 0) {
            throw new NotFoundException(`Meet with id ${id} not found`)
        }

        return meets[0]
    }

    async getMeetsByGroupId(groupId: number): Promise<Array<MeetDto>> {
        this.LOGGER.log('Getting all meetings for group')
        const resultSet = await this.databaseService.sessions.getMeetsByGroupId(groupId)

        return this._parseResultSet(resultSet)
    }

    async getMeetDetailsById(id: number, accountId: number): Promise<MeetWithAttendeesAndGames> {
        this.LOGGER.log('Getting meeting details')
        const resultSet = await this.databaseService.sessions.getMeetDetailsByIdForAccount(id, accountId)
        const meet = mapMeetDetailsResult(resultSet)

        if (!meet) {
            throw new NotFoundException(`Meet with id ${id} not found`)
        }

        return meet
    }
}
