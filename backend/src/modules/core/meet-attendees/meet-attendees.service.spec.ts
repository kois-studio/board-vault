import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database'

import { MeetAttendeesService } from './meet-attendees.service'

describe('MeetAttendeesService authorization', () => {
    it('requires the meeting creator to manage attendees', async () => {
        const getMeetByIdForCreator = jest.fn().mockResolvedValue({ rows: [] })
        const service = new MeetAttendeesService(fakeDatabase({ getMeetByIdForCreator }))

        await expect(service.createMeetAttendee(8, 12, 21)).rejects.toThrow(ForbiddenException)
    })

    it('requires the target account to belong to the meeting group', async () => {
        const getMeetByIdForCreator = jest.fn().mockResolvedValue({ rows: [[12]] })
        const getMeetMember = jest.fn().mockResolvedValue({ rows: [] })
        const service = new MeetAttendeesService(fakeDatabase({ getMeetByIdForCreator, getMeetMember }))

        await expect(service.createMeetAttendee(7, 12, 21)).rejects.toThrow(BadRequestException)
    })

    it('derives the actor from the authenticated account and creates the target attendee', async () => {
        const getMeetByIdForCreator = jest.fn().mockResolvedValue({ rows: [[12]] })
        const getMeetMember = jest.fn().mockResolvedValue({ rows: [[1]] })
        const createMeetAttendee = jest.fn().mockResolvedValue({ rowsAffected: 1 })
        const service = new MeetAttendeesService(fakeDatabase({ getMeetByIdForCreator, getMeetMember, createMeetAttendee }))

        await expect(service.createMeetAttendee(7, 12, 21)).resolves.toEqual({ meetId: 12, accountId: 21 })
        expect(getMeetByIdForCreator).toHaveBeenCalledWith(12, 7)
        expect(getMeetMember).toHaveBeenCalledWith(12, 21)
        expect(createMeetAttendee).toHaveBeenCalledWith(12, 21)
    })

    it('returns not found when the creator removes a missing attendee', async () => {
        const getMeetByIdForCreator = jest.fn().mockResolvedValue({ rows: [[12]] })
        const deleteMeetAttendee = jest.fn().mockResolvedValue({ rowsAffected: 0 })
        const service = new MeetAttendeesService(fakeDatabase({ getMeetByIdForCreator, deleteMeetAttendee }))

        await expect(service.deleteMeetAttendee(7, 12, 21)).rejects.toThrow(NotFoundException)
    })
})
