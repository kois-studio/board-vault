import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../common/database/database.service'
import { MeetAttendeeDto } from '../../common/types/meet-attendee.type'
import { meetAttendeesSchema } from '../../common/schemas/db-meet-attendee.schema'

@Injectable()
export class MeetAttendeesService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<MeetAttendeeDto> {
        const meetAttendees = resultSet.rows.map(row => ({
            meetId: Number(row[0]),
            accountId: Number(row[1]),
        }))
        
        return this._validateSchema(meetAttendees)
    }

    private _validateSchema(meetAttendees: Array<MeetAttendeeDto>): Array<MeetAttendeeDto> {
        const result = meetAttendeesSchema.safeParse(meetAttendees)

        if (!result.success) {
            this.LOGGER.error('Failed to parse MeetAttendees from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    // #region methods

    async getMeetAttendees(): Promise<Array<MeetAttendeeDto>> {
        this.LOGGER.log('Getting all meet attendees')
        const resultSet = await this.databaseService.getMeetAttendees()

        return this._parseResultSet(resultSet)
    }

    async createMeetAttendee(meetId: number, accountId: number): Promise<MeetAttendeeDto> {
        this.LOGGER.log(`Creating meetAttendee with accountId ${accountId} and meetId ${meetId}`)
        const resultSet = await this.databaseService.createMeetAttendee(meetId, accountId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Meet with meetId ${meetId} not found`)
        }

        return this._parseResultSet(resultSet)[0]
    }

    async deleteMeetAttendee(meetId: number, accountId: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting meetAttendee with accountId ${accountId} and meetId ${meetId}`)
        const resultSet = await this.databaseService.deleteMeetAttendee(meetId, accountId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Meet with meetId ${meetId} not found`)
        }

        return { success: true }
    }
}
