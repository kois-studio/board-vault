import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service'

import { MeetAttendeesService } from './meet-attendees.service'

describe('MeetAttendeesService authorization', () => {
    it('requires the meeting creator to manage attendees', async () => {
        const getMeetByIdForCreator = jest.fn().mockResolvedValue({ rows: [] })
        const service = new MeetAttendeesService({ getMeetByIdForCreator } as unknown as DatabaseService)

        await expect(service.createMeetAttendee(8, 12, 21)).rejects.toThrow(ForbiddenException)
    })

    it('requires the target account to belong to the meeting group', async () => {
        const getMeetByIdForCreator = jest.fn().mockResolvedValue({ rows: [[12]] })
        const getMeetMember = jest.fn().mockResolvedValue({ rows: [] })
        const service = new MeetAttendeesService({ getMeetByIdForCreator, getMeetMember } as unknown as DatabaseService)

        await expect(service.createMeetAttendee(7, 12, 21)).rejects.toThrow(BadRequestException)
    })

    it('derives the actor from the authenticated account and creates the target attendee', async () => {
        const getMeetByIdForCreator = jest.fn().mockResolvedValue({ rows: [[12]] })
        const getMeetMember = jest.fn().mockResolvedValue({ rows: [[1]] })
        const createMeetAttendee = jest.fn().mockResolvedValue({ rowsAffected: 1 })
        const service = new MeetAttendeesService({ getMeetByIdForCreator, getMeetMember, createMeetAttendee } as unknown as DatabaseService)

        await expect(service.createMeetAttendee(7, 12, 21)).resolves.toEqual({ meetId: 12, accountId: 21 })
        expect(getMeetByIdForCreator).toHaveBeenCalledWith(12, 7)
        expect(getMeetMember).toHaveBeenCalledWith(12, 21)
        expect(createMeetAttendee).toHaveBeenCalledWith(12, 21)
    })

    it('returns not found when the creator removes a missing attendee', async () => {
        const getMeetByIdForCreator = jest.fn().mockResolvedValue({ rows: [[12]] })
        const deleteMeetAttendee = jest.fn().mockResolvedValue({ rowsAffected: 0 })
        const service = new MeetAttendeesService({ getMeetByIdForCreator, deleteMeetAttendee } as unknown as DatabaseService)

        await expect(service.deleteMeetAttendee(7, 12, 21)).rejects.toThrow(NotFoundException)
    })
})
