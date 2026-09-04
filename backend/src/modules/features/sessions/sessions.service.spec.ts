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
        replaceMeetAttendees: jest.fn().mockResolvedValue(undefined),
        getMeetByIdForCreator: jest
            .fn()
            .mockResolvedValue({ rows: [[12, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'scheduled', 'Europe/Madrid', null]] }),
        getMeetDetailsByIdForAccount: jest.fn(),
        updateMeetStatus: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
        getMeetAttendeeForAccount: jest.fn(),
        updateMeetAttendeeRsvp: jest.fn(),
        getMeetAttendeeIds: jest.fn().mockResolvedValue([1, 2]),
        updateMeetAttendance: jest.fn().mockResolvedValue(undefined),
        replaceMeetPlannedGames: jest.fn().mockResolvedValue(undefined),
        getMeetPlayedGameParticipants: jest.fn().mockResolvedValue([]),
        replaceMeetPlayedGames: jest.fn().mockResolvedValue({ playedGameIds: [42], skippedGameIds: [43] }),
    }
}

describe('SessionsService', () => {
    it('reads session details through the member-scoped canonical query', async () => {
        const database = createDatabaseMock()

        database.getMeetDetailsByIdForAccount.mockResolvedValue({
            rows: [
                [
                    12,
                    7,
                    1,
                    '2026-08-16T19:30:00.000Z',
                    1,
                    '[1,2]',
                    '[{"accountId":1,"rsvpStatus":"accepted","attendanceStatus":"attended"}]',
                    '[42]',
                    '[43]',
                    '[]',
                    '[{"gameId":42,"participantIds":[1]}]',
                    'completed',
                    'Europe/Madrid',
                    'A memorable night',
                ],
            ],
        })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.getSessionDetails(2, 12)).resolves.toEqual({
            id: 12,
            groupId: 7,
            createdBy: 1,
            meetDate: '2026-08-16T19:30:00.000Z',
            isConfirmed: true,
            attendees: [1, 2],
            attendeeStatuses: [{ accountId: 1, rsvpStatus: 'accepted', attendanceStatus: 'attended' }],
            playedGames: [42],
            plannedGames: [43],
            skippedGames: [],
            playedGameParticipants: [{ gameId: 42, participantIds: [1] }],
            status: 'completed',
            timezone: 'Europe/Madrid',
            notes: 'A memorable night',
        })
        expect(database.getMeetDetailsByIdForAccount).toHaveBeenCalledWith(12, 2)
    })

    it('does not reveal a session to a non-member', async () => {
        const database = createDatabaseMock()

        database.getMeetDetailsByIdForAccount.mockResolvedValue({ rows: [] })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.getSessionDetails(99, 12)).rejects.toThrow(NotFoundException)
    })

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

    it('rejects a completed session without attendees', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.createCompletedSession(1, { ...body, attendeeIds: [] })).rejects.toThrow(
            'A completed session must have at least one attendee',
        )
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

    it('rejects a completed game without participants', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.createCompletedSession(1, { ...body, games: [{ gameId: 42, participantIds: [] }] })).rejects.toThrow(
            'Every played game must have at least one participant',
        )
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('schedules a session for every current group member when attendees are omitted', async () => {
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
            plannedGameIds: [],
        })
    })

    it('schedules a session for selected group attendees', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(
            service.createScheduledSession(1, {
                groupId: 7,
                sessionDate: '2026-08-21T19:30:00.000Z',
                timezone: 'Europe/Madrid',
                attendeeIds: [1, 3],
                plannedGameIds: [42],
            }),
        ).resolves.toEqual({ sessionId: 13, status: 'scheduled' })
        expect(database.createScheduledSession).toHaveBeenCalledWith({
            groupId: 7,
            createdBy: 1,
            sessionDate: '2026-08-21T19:30:00.000Z',
            timezone: 'Europe/Madrid',
            attendeeIds: [1, 3],
            plannedGameIds: [42],
        })
    })

    it('lets an invited member update their RSVP without changing organizer attendance', async () => {
        const database = createDatabaseMock()

        database.getMeetAttendeeForAccount = jest.fn().mockResolvedValue({ rows: [[13, 2, 'pending', 'unknown', null, 'scheduled']] })
        database.updateMeetAttendeeRsvp = jest.fn().mockResolvedValue({ rowsAffected: 1 })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionRsvp(2, 13, { rsvpStatus: 'accepted' })).resolves.toEqual({
            sessionId: 13,
            rsvpStatus: 'accepted',
        })
        expect(database.updateMeetAttendeeRsvp).toHaveBeenCalledWith(13, 2, 'accepted')
    })

    it('rejects RSVP changes after a session is closed', async () => {
        const database = createDatabaseMock()

        database.getMeetAttendeeForAccount = jest.fn().mockResolvedValue({ rows: [[13, 2, 'accepted', 'attended', null, 'completed']] })
        database.updateMeetAttendeeRsvp = jest.fn()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionRsvp(2, 13, { rsvpStatus: 'declined' })).rejects.toThrow('Cannot RSVP to a completed session')
        expect(database.updateMeetAttendeeRsvp).not.toHaveBeenCalled()
    })

    it('lets the organizer record actual attendance for an active session', async () => {
        const database = createDatabaseMock()

        database.getMeetByIdForCreator.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionAttendance(1, 13, { attendedIds: [1] })).resolves.toEqual({ sessionId: 13, attendedIds: [1] })
        expect(database.updateMeetAttendance).toHaveBeenCalledWith(13, [1])
    })

    it('rejects attendance for members who were not invited', async () => {
        const database = createDatabaseMock()

        database.getMeetByIdForCreator.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionAttendance(1, 13, { attendedIds: [3] })).rejects.toThrow(
            'Attendance can only be recorded for invited members',
        )
        expect(database.updateMeetAttendance).not.toHaveBeenCalled()
    })

    it('allows the organizer to record that nobody attended', async () => {
        const database = createDatabaseMock()

        database.getMeetByIdForCreator.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-16T19:30:00.000Z', 1, 'completed', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionAttendance(1, 13, { attendedIds: [] })).resolves.toEqual({ sessionId: 13, attendedIds: [] })
        expect(database.updateMeetAttendance).toHaveBeenCalledWith(13, [])
    })

    it('lets the organizer edit the shortlist on an active session', async () => {
        const database = createDatabaseMock()

        database.getMeetByIdForCreator.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionShortlist(1, 13, { plannedGameIds: [43, 42] })).resolves.toEqual({
            sessionId: 13,
            plannedGameIds: [43, 42],
        })
        expect(database.replaceMeetPlannedGames).toHaveBeenCalledWith(13, [43, 42])
    })

    it('rejects shortlist games that no group member owns', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionShortlist(1, 13, { plannedGameIds: [99] })).rejects.toThrow(
            'Every planned game must be owned by at least one group member',
        )
        expect(database.replaceMeetPlannedGames).not.toHaveBeenCalled()
    })

    it('rejects selected attendees outside the group', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(
            service.createScheduledSession(1, {
                groupId: 7,
                sessionDate: '2026-08-21T19:30:00.000Z',
                timezone: 'Europe/Madrid',
                attendeeIds: [1, 99],
            }),
        ).rejects.toThrow(BadRequestException)
        expect(database.createScheduledSession).not.toHaveBeenCalled()
    })

    it('rejects planned games unavailable to the selected group', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(
            service.createScheduledSession(1, {
                groupId: 7,
                sessionDate: '2026-08-21T19:30:00.000Z',
                timezone: 'Europe/Madrid',
                plannedGameIds: [99],
            }),
        ).rejects.toThrow(BadRequestException)
        expect(database.createScheduledSession).not.toHaveBeenCalled()
    })

    it('records group-level played games while preserving the compatibility participant fallback', async () => {
        const database = createDatabaseMock()

        database.getMeetByIdForCreator.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-21T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        database.getMeetPlayedGameParticipants.mockResolvedValue([{ gameId: 42, participantIds: [1, 2] }])
        database.replaceMeetPlayedGames.mockResolvedValue({
            playedGameIds: [42],
            skippedGameIds: [43],
            playedGameParticipants: [{ gameId: 42, participantIds: [1, 2] }],
        })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionPlayedGames(1, 13, { playedGameIds: [42] })).resolves.toEqual({
            sessionId: 13,
            playedGameIds: [42],
            skippedGameIds: [43],
            playedGameParticipants: [{ gameId: 42, participantIds: [1, 2] }],
        })
        expect(database.getMeetPlayedGameParticipants).toHaveBeenCalledWith(13)
        expect(database.replaceMeetPlayedGames).toHaveBeenCalledWith(13, [{ gameId: 42, participantIds: [1, 2] }])
    })

    it('validates per-game participants against the session attendees', async () => {
        const database = createDatabaseMock()

        database.getMeetByIdForCreator.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-21T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(
            service.updateSessionPlayedGames(1, 13, {
                playedGameIds: [42],
                games: [{ gameId: 42, participantIds: [3] }],
            }),
        ).rejects.toThrow('Game participants must be invited session attendees')
        expect(database.replaceMeetPlayedGames).not.toHaveBeenCalled()
    })

    it('rejects a played game without participants', async () => {
        const database = createDatabaseMock()

        database.getMeetByIdForCreator.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-21T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(
            service.updateSessionPlayedGames(1, 13, {
                playedGameIds: [42],
                games: [{ gameId: 42, participantIds: [] }],
            }),
        ).rejects.toThrow('Every played game must have at least one participant')
        expect(database.replaceMeetPlayedGames).not.toHaveBeenCalled()
    })

    it('rejects played games unavailable to the session group', async () => {
        const database = createDatabaseMock()

        database.getMeetByIdForCreator.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-21T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionPlayedGames(1, 13, { playedGameIds: [99] })).rejects.toThrow(
            'Every played game must be owned by at least one group member',
        )
        expect(database.replaceMeetPlayedGames).not.toHaveBeenCalled()
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

    it('replaces attendees for an organizer-owned active session', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionAttendees(1, 12, { attendeeIds: [1, 3] })).resolves.toEqual({
            sessionId: 12,
            attendeeIds: [1, 3],
        })
        expect(database.replaceMeetAttendees).toHaveBeenCalledWith(12, [1, 3])
    })

    it('rejects attendee replacement when a target is outside the group', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionAttendees(1, 12, { attendeeIds: [1, 99] })).rejects.toThrow(BadRequestException)
        expect(database.replaceMeetAttendees).not.toHaveBeenCalled()
    })

    it('rejects replacing attendees with an empty set', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionAttendees(1, 12, { attendeeIds: [] })).rejects.toThrow(
            'A session must retain at least one attendee',
        )
        expect(database.replaceMeetAttendees).not.toHaveBeenCalled()
    })

    it('does not remove a participant from the attendee list after a game is recorded', async () => {
        const database = createDatabaseMock()

        database.getMeetPlayedGameParticipants.mockResolvedValue([{ gameId: 42, participantIds: [2] }])
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionAttendees(1, 12, { attendeeIds: [1] })).rejects.toThrow(
            'A member who played a recorded game cannot be removed from the session attendees',
        )
        expect(database.replaceMeetAttendees).not.toHaveBeenCalled()
    })

    it('rejects attendee replacement on a completed session', async () => {
        const database = createDatabaseMock()

        database.getMeetByIdForCreator.mockResolvedValue({ rows: [[12, 7, 1, '2026-08-16T19:30:00.000Z', 1, 'completed', 'UTC', null]] })
        const service = new SessionsService(database as unknown as DatabaseService)

        await expect(service.updateSessionAttendees(1, 12, { attendeeIds: [1] })).rejects.toThrow(BadRequestException)
        expect(database.replaceMeetAttendees).not.toHaveBeenCalled()
    })
})
