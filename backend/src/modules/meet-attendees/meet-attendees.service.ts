import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
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
            isAttending: Boolean(row[2]),
        }))

        const result = meetAttendeesSchema.safeParse(meetAttendees)

        if (!result.success) {
            this.LOGGER.error('Failed to parse meet atendees from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getMeetAttendees(): Promise<Array<MeetAttendeeDto>> {
        this.LOGGER.log('Getting all meet attendees')
        const resultSet = await this.databaseService.getMeetAttendees()

        return this._parseResultSet(resultSet)
    }
}
