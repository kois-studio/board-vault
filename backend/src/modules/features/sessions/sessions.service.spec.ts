import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'

import { DatabaseService } from '../../common/database/database.service'

import { SessionsService } from './sessions.service'

const body = {
    groupId: 7,
    sessionDate: '2026-08-16T19:30:00.000Z',
    timezone: 'Europe/Madrid',
    attendeeIds: [1, 2],
    games: [
        { gameId: 42, participantIds: [1, 2] },
        { gameId: 43, participantIds: [1] },
    ],
}

function createDatabaseMock() {
    return {
        getGroupById: jest.fn().mockResolvedValue({ rows: [[7, 'Friday Group', 1, '2026-01-01']] }),
        getGroupMemberIds: jest.fn().mockResolvedValue([1, 2, 3]),
        getGroupAvailableGameIds: jest.fn().mockResolvedValue([42, 43]),
        createCompletedSession: jest.fn().mockResolvedValue({ lastInsertRowid: 12 }),
        createScheduledSession: jest.fn().mockResolvedValue({ lastInsertRowid: 13 }),
        getMeetByIdForCreator: jest
            .fn()
            .mockResolvedValue({ rows: [[12, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'scheduled', 'Europe/Madrid', null]] }),
        updateMeetStatus: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
    }
}

describe('SessionsService', () => {
    it('creates a completed session from group members and available games', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.createCompletedSession(1, body)).resolves.toEqual({ sessionId: 12, status: 'completed' })
        expect(database.createCompletedSession).toHaveBeenCalledWith({
            groupId: 7,
            createdBy: 1,
            sessionDate: body.sessionDate,
            timezone: body.timezone,
            attendeeIds: body.attendeeIds,
            games: body.games,
        })
    })

    it('rejects a missing group', async () => {
        const database = createDatabaseMock()
        database.getGroupById.mockResolvedValue({ rows: [] })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.createCompletedSession(1, body)).rejects.toThrow(NotFoundException)
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('requires the actor to belong to the selected group', async () => {
        const database = createDatabaseMock()
        database.getGroupMemberIds.mockResolvedValue([2, 3])
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.createCompletedSession(1, body)).rejects.toThrow(ForbiddenException)
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('rejects attendees outside the selected group', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.createCompletedSession(1, { ...body, attendeeIds: [1, 99] })).rejects.toThrow(BadRequestException)
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('rejects games unavailable to the selected group', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.createCompletedSession(1, { ...body, games: [{ gameId: 99, participantIds: [1] }] })).rejects.toThrow(
            BadRequestException,
        )
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('rejects game participants who are not selected attendees', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.createCompletedSession(1, { ...body, games: [{ gameId: 42, participantIds: [3] }] })).rejects.toThrow(
            BadRequestException,
        )
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('schedules a session for every current group member', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)
        const scheduledBody = {
            groupId: 7,
            sessionDate: '2026-08-21T19:30:00.000Z',
            timezone: 'Europe/Madrid',
        }

        await expect(service.createScheduledSession(1, scheduledBody)).resolves.toEqual({ sessionId: 13, status: 'scheduled' })
        expect(database.createScheduledSession).toHaveBeenCalledWith({
            groupId: 7,
            createdBy: 1,
            sessionDate: scheduledBody.sessionDate,
            timezone: scheduledBody.timezone,
            attendeeIds: [1, 2, 3],
        })
    })

    it('rejects scheduling when the actor is outside the group', async () => {
        const database = createDatabaseMock()
        database.getGroupMemberIds.mockResolvedValue([2, 3])
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(
            service.createScheduledSession(1, {
                groupId: 7,
                sessionDate: '2026-08-21T19:30:00.000Z',
                timezone: 'Europe/Madrid',
            }),
        ).rejects.toThrow(ForbiddenException)
        expect(database.createScheduledSession).not.toHaveBeenCalled()
    })

    it('allows an organizer to transition a scheduled session to active', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionStatus(1, 12, { status: 'active' })).resolves.toEqual({ sessionId: 12, status: 'active' })
        expect(database.updateMeetStatus).toHaveBeenCalledWith(12, 'active')
    })

    it('rejects invalid lifecycle transitions', async () => {
        const database = createDatabaseMock()
        database.getMeetByIdForCreator.mockResolvedValue({ rows: [[12, 7, 1, '2026-08-16T19:30:00.000Z', 1, 'completed', 'UTC', null]] })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionStatus(1, 12, { status: 'active' })).rejects.toThrow(BadRequestException)
        expect(database.updateMeetStatus).not.toHaveBeenCalled()
    })

    it('requires the organizer to transition a session', async () => {
        const database = createDatabaseMock()
        database.getMeetByIdForCreator.mockResolvedValue({ rows: [] })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionStatus(2, 12, { status: 'cancelled' })).rejects.toThrow(ForbiddenException)
        expect(database.updateMeetStatus).not.toHaveBeenCalled()
    })
})
