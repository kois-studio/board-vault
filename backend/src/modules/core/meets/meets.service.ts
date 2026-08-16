import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { meetsSchema } from '../../../common/schemas/db-meet.schema'
import { GameDto } from '../../../common/types/game.type'
import { MeetCreatedDto, MeetDto, MeetWithAttendeesAndGames } from '../../../common/types/meet.type'
import { UserGetDto } from '../../../common/types/user.type'
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
        }))

        const result = meetsSchema.safeParse(meets)

        if (!result.success) {
            this.LOGGER.error('Failed to parse meets from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getMeetsForAccount(accountId: number): Promise<Array<MeetDto>> {
        this.LOGGER.log(`Getting meets for account ${accountId}`)
        const resultSet = await this.databaseService.getMeetsForAccount(accountId)

        return this._parseResultSet(resultSet)
    }

    async getMeetById(id: number, accountId: number): Promise<MeetDto> {
        this.LOGGER.log(`Getting meet with id ${id}`)
        const resultSet = await this.databaseService.getMeetByIdForAccount(id, accountId)
        const meets = this._parseResultSet(resultSet)

        if (meets.length === 0) {
            throw new NotFoundException(`Meet with id ${id} not found`)
        }

        return meets[0]
    }

    async getMeetsByGroupId(groupId: number): Promise<Array<MeetDto>> {
        this.LOGGER.log(`Getting all meets for group ${groupId}`)
        const resultSet = await this.databaseService.getMeetsByGroupId(groupId)

        return this._parseResultSet(resultSet)
    }

    // TODO: sus
    async getMeetDetailsById(id: number, accountId: number): Promise<MeetWithAttendeesAndGames> {
        this.LOGGER.log(`Getting meet details with id ${id}`)
        const resultSet = await this.databaseService.getMeetDetailsByIdForAccount(id, accountId)

        if (resultSet.rows.length === 0) {
            throw new NotFoundException(`Meet with id ${id} not found`)
        }

        return resultSet.rows.map(row => ({
            id: Number(row[0]),
            groupId: Number(row[1]),
            createdBy: Number(row[2]),
            meetDate: String(row[3]),
            isConfirmed: Boolean(row[4]),
            attendees: JSON.parse(String(row[5])) as Array<UserGetDto['id']>,
            playedGames: JSON.parse(String(row[6])) as Array<GameDto['id']>,
            status: String(row[7] ?? 'completed') as MeetWithAttendeesAndGames['status'],
            timezone: String(row[8] ?? 'UTC'),
        }))[0]
    }

    async createMeeting(groupId: number, createdBy: number): Promise<MeetCreatedDto> {
        this.LOGGER.log(`Creating meeting for group ${groupId} created by ${createdBy}`)

        try {
            const resultSet = await this.databaseService.createMeeting(groupId, createdBy)

            return { meetId: Number(resultSet.lastInsertRowid) }
        } catch (error) {
            this.LOGGER.error('Failed to create meeting', error)
            throw new NotFoundException('Failed to create meeting')
        }
    }
}
