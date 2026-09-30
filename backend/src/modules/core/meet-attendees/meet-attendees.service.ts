import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service'

@Injectable()
export class MeetAttendeesService {
    constructor(private readonly databaseService: DatabaseService) {}

    private async _assertMeetCreator(accountId: number, meetId: number) {
        const resultSet = await this.databaseService.sessions.getMeetByIdForCreator(meetId, accountId)

        if (resultSet.rows.length === 0) {
            throw new ForbiddenException('Only the meeting creator can manage attendees')
        }
    }

    private async _assertMeetMember(meetId: number, accountId: number) {
        const resultSet = await this.databaseService.sessions.getMeetMember(meetId, accountId)

        if (resultSet.rows.length === 0) {
            throw new BadRequestException('The target account is not a member of the meeting group')
        }
    }

    async createMeetAttendee(actorAccountId: number, meetId: number, targetAccountId: number) {
        await this._assertMeetCreator(actorAccountId, meetId)
        await this._assertMeetMember(meetId, targetAccountId)
        await this.databaseService.sessions.createMeetAttendee(meetId, targetAccountId)

        return { meetId, accountId: targetAccountId }
    }

    async deleteMeetAttendee(actorAccountId: number, meetId: number, targetAccountId: number) {
        await this._assertMeetCreator(actorAccountId, meetId)
        const resultSet = await this.databaseService.sessions.deleteMeetAttendee(meetId, targetAccountId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException('Meet attendee not found')
        }

        return { success: true }
    }
}
