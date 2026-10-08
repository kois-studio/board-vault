import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database.js'

import { SessionsService } from './sessions.service.js'

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
        getGroupById: vi.fn().mockResolvedValue({ rows: [[7, 'Friday Group', 1, '2026-01-01']] }),
        getGroupMemberIds: vi.fn().mockResolvedValue([1, 2, 3]),
        getGroupAvailableGameIds: vi.fn().mockResolvedValue([42, 43]),
        createCompletedSession: vi.fn().mockResolvedValue({ lastInsertRowid: 12 }),
        createScheduledSession: vi.fn().mockResolvedValue({ lastInsertRowid: 13 }),
        replaceMeetAttendees: vi.fn().mockResolvedValue(true),
        getMeetAccessForAccount: vi
            .fn()
            .mockResolvedValue({ rows: [[12, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'scheduled', 'Europe/Madrid', null]] }),
        getMeetDetailsByIdForAccount: vi.fn(),
        updateMeetStatus: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
        countPlayedMeetGames: vi.fn().mockResolvedValue({ rows: [{ played: 1 }] }),
        getMeetAttendeeForAccount: vi.fn(),
        updateMeetAttendeeRsvp: vi.fn(),
        getMeetAttendeeIds: vi.fn().mockResolvedValue([1, 2]),
        getMeetPersonIds: vi.fn().mockResolvedValue([]),
        getGroupPeople: vi.fn().mockResolvedValue({ rows: [] }),
        getGroupAvailableGameIdsForPeople: vi.fn().mockResolvedValue([]),
        updateMeetAttendance: vi.fn().mockResolvedValue(undefined),
        markPlayersAttended: vi.fn().mockResolvedValue(undefined),
        replaceMeetPlannedGames: vi.fn().mockResolvedValue(true),
        getMeetPlayedGameParticipants: vi.fn().mockResolvedValue([]),
        replaceMeetPlayedGames: vi.fn().mockResolvedValue({ applied: true, playedGameIds: [42], skippedGameIds: [43] }),
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
        const service = new SessionsService(fakeDatabase(database))

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
            gameResults: [],
        })
        expect(database.getMeetDetailsByIdForAccount).toHaveBeenCalledWith(12, 2)
    })

    it('does not reveal a session to a non-member', async () => {
        const database = createDatabaseMock()

        database.getMeetDetailsByIdForAccount.mockResolvedValue({ rows: [] })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.getSessionDetails(99, 12)).rejects.toThrow(NotFoundException)
    })

    it('creates a completed session from group members and available games', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

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

    it('creates a completed session with mixed account and group-person participants', async () => {
        const database = createDatabaseMock()

        database.getGroupPeople.mockResolvedValue({
            rows: [
                [10, 7, null, 'placeholder', 'active', 'Ana', null, null, null, null, 'member'],
                [11, 7, 2, 'linked', 'active', 'example-member', null, null, null, null, 'member'],
            ],
        })
        database.getGroupAvailableGameIdsForPeople.mockResolvedValue([84])
        const mixedBody = {
            ...body,
            attendeeIds: [1],
            groupPersonIds: [10, 11],
            games: [{ gameId: 84, participantIds: [1], participantPersonIds: [10, 11] }],
        }
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.createCompletedSession(1, mixedBody)).resolves.toEqual({ sessionId: 12, status: 'completed' })
        expect(database.createCompletedSession).toHaveBeenCalledWith({
            groupId: 7,
            createdBy: 1,
            sessionDate: body.sessionDate,
            timezone: body.timezone,
            attendeeIds: [1],
            groupPersonIds: [10, 11],
            games: [{ gameId: 84, participantIds: [1] }],
            personGames: [{ gameId: 84, participantIds: [10, 11] }],
        })
    })

    it('schedules a session with placeholder participants', async () => {
        const database = createDatabaseMock()

        database.getGroupPeople.mockResolvedValue({
            rows: [[10, 7, null, 'placeholder', 'active', 'Ana', null, null, null, null, 'member']],
        })
        database.getGroupAvailableGameIdsForPeople.mockResolvedValue([84])
        const service = new SessionsService(fakeDatabase(database))

        await expect(
            service.createScheduledSession(1, {
                groupId: 7,
                sessionDate: '2026-08-21T19:30:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: [10],
                plannedGameIds: [84],
            }),
        ).resolves.toEqual({ sessionId: 13, status: 'scheduled' })
        expect(database.createScheduledSession).toHaveBeenCalledWith({
            groupId: 7,
            createdBy: 1,
            sessionDate: '2026-08-21T19:30:00.000Z',
            timezone: 'Europe/Madrid',
            attendeeIds: [],
            groupPersonIds: [10],
            plannedGameIds: [84],
        })
    })

    it('rejects a missing group', async () => {
        const database = createDatabaseMock()

        database.getGroupById.mockResolvedValue({ rows: [] })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.createCompletedSession(1, body)).rejects.toThrow(NotFoundException)
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('requires the actor to belong to the selected group', async () => {
        const database = createDatabaseMock()

        database.getGroupMemberIds.mockResolvedValue([2, 3])
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.createCompletedSession(1, body)).rejects.toThrow(ForbiddenException)
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('rejects attendees outside the selected group', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.createCompletedSession(1, { ...body, attendeeIds: [1, 99] })).rejects.toThrow(BadRequestException)
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('rejects a completed session without attendees', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.createCompletedSession(1, { ...body, attendeeIds: [] })).rejects.toThrow(
            'A completed session must have at least one attendee',
        )
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('rejects games unavailable to the selected group', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.createCompletedSession(1, { ...body, games: [{ gameId: 99, participantIds: [1] }] })).rejects.toThrow(
            BadRequestException,
        )
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('rejects game participants who are not selected attendees', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.createCompletedSession(1, { ...body, games: [{ gameId: 42, participantIds: [3] }] })).rejects.toThrow(
            BadRequestException,
        )
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('rejects a completed game without participants', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.createCompletedSession(1, { ...body, games: [{ gameId: 42, participantIds: [] }] })).rejects.toThrow(
            'Every played game must have at least one participant',
        )
        expect(database.createCompletedSession).not.toHaveBeenCalled()
    })

    it('schedules a session for every current group member when attendees are omitted', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))
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
        const service = new SessionsService(fakeDatabase(database))

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

        database.getMeetAttendeeForAccount = vi.fn().mockResolvedValue({ rows: [[13, 2, 'pending', 'unknown', null, 'scheduled']] })
        database.updateMeetAttendeeRsvp = vi.fn().mockResolvedValue({ rowsAffected: 1 })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionRsvp(2, 13, { rsvpStatus: 'accepted' })).resolves.toEqual({
            sessionId: 13,
            rsvpStatus: 'accepted',
        })
        expect(database.updateMeetAttendeeRsvp).toHaveBeenCalledWith(13, 2, 'accepted')
    })

    it('rejects RSVP changes after a session is closed', async () => {
        const database = createDatabaseMock()

        database.getMeetAttendeeForAccount = vi.fn().mockResolvedValue({ rows: [[13, 2, 'accepted', 'attended', null, 'completed']] })
        database.updateMeetAttendeeRsvp = vi.fn()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionRsvp(2, 13, { rsvpStatus: 'declined' })).rejects.toThrow('Cannot RSVP to a completed session')
        expect(database.updateMeetAttendeeRsvp).not.toHaveBeenCalled()
    })

    it('lets the organizer record actual attendance for an active session', async () => {
        const database = createDatabaseMock()

        database.getMeetAccessForAccount.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionAttendance(1, 13, { attendedIds: [1] })).resolves.toEqual({ sessionId: 13, attendedIds: [1] })
        expect(database.updateMeetAttendance).toHaveBeenCalledWith(13, [1])
    })

    it('rejects attendance for members who were not invited', async () => {
        const database = createDatabaseMock()

        database.getMeetAccessForAccount.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionAttendance(1, 13, { attendedIds: [3] })).rejects.toThrow(
            'Attendance can only be recorded for invited members',
        )
        expect(database.updateMeetAttendance).not.toHaveBeenCalled()
    })

    it('allows the organizer to record that nobody attended', async () => {
        const database = createDatabaseMock()

        database.getMeetAccessForAccount.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-16T19:30:00.000Z', 1, 'completed', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionAttendance(1, 13, { attendedIds: [] })).resolves.toEqual({ sessionId: 13, attendedIds: [] })
        expect(database.updateMeetAttendance).toHaveBeenCalledWith(13, [])
    })

    it('lets the organizer edit the shortlist on an active session', async () => {
        const database = createDatabaseMock()

        database.getMeetAccessForAccount.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionShortlist(1, 13, { plannedGameIds: [43, 42] })).resolves.toEqual({
            sessionId: 13,
            plannedGameIds: [43, 42],
        })
        expect(database.replaceMeetPlannedGames).toHaveBeenCalledWith(13, [43, 42], 'active')
    })

    it('rejects shortlist games that no group member owns', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionShortlist(1, 13, { plannedGameIds: [99] })).rejects.toThrow(
            'Every planned game must be owned by at least one group member',
        )
        expect(database.replaceMeetPlannedGames).not.toHaveBeenCalled()
    })

    it('rejects selected attendees outside the group', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

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
        const service = new SessionsService(fakeDatabase(database))

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

        database.getMeetAccessForAccount.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-21T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        database.getMeetPlayedGameParticipants.mockResolvedValue([{ gameId: 42, participantIds: [1, 2] }])
        database.replaceMeetPlayedGames.mockResolvedValue({
            playedGameIds: [42],
            skippedGameIds: [43],
            playedGameParticipants: [{ gameId: 42, participantIds: [1, 2] }],
        })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionPlayedGames(1, 13, { playedGameIds: [42] })).resolves.toEqual({
            sessionId: 13,
            playedGameIds: [42],
            skippedGameIds: [43],
            playedGameParticipants: [{ gameId: 42, participantIds: [1, 2] }],
        })
        expect(database.getMeetPlayedGameParticipants).toHaveBeenCalledWith(13)
        expect(database.replaceMeetPlayedGames).toHaveBeenCalledWith(13, [{ gameId: 42, participantIds: [1, 2] }], 'active')
    })

    it('records mixed account and group-person game participants and reports stale-write conflicts', async () => {
        const database = createDatabaseMock()

        database.getMeetAccessForAccount.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-21T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        database.getMeetAttendeeIds.mockResolvedValue([1])
        database.getMeetPersonIds.mockResolvedValue([10])
        database.getGroupAvailableGameIdsForPeople.mockResolvedValue([84])
        database.replaceMeetPlayedGames.mockResolvedValue({
            applied: false,
            playedGameIds: [],
            skippedGameIds: [],
            playedGameParticipants: [],
        })
        const service = new SessionsService(fakeDatabase(database))

        await expect(
            service.updateSessionPlayedGames(1, 13, {
                playedGameIds: [84],
                games: [{ gameId: 84, participantIds: [1], participantPersonIds: [10] }],
            }),
        ).rejects.toThrow('The session changed while played games were being updated')
        expect(database.replaceMeetPlayedGames).toHaveBeenCalledWith(13, [{ gameId: 84, participantIds: [1] }], 'active', [
            { gameId: 84, participantIds: [10] },
        ])
    })

    it('validates per-game participants against the session attendees', async () => {
        const database = createDatabaseMock()

        database.getMeetAccessForAccount.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-21T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(fakeDatabase(database))

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

        database.getMeetAccessForAccount.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-21T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(fakeDatabase(database))

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

        database.getMeetAccessForAccount.mockResolvedValue({
            rows: [[13, 7, 1, '2026-08-21T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionPlayedGames(1, 13, { playedGameIds: [99] })).rejects.toThrow(
            'Every played game must be owned by at least one group member',
        )
        expect(database.replaceMeetPlayedGames).not.toHaveBeenCalled()
    })

    it('rejects scheduling when the actor is outside the group', async () => {
        const database = createDatabaseMock()

        database.getGroupMemberIds.mockResolvedValue([2, 3])
        const service = new SessionsService(fakeDatabase(database))

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
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionStatus(1, 12, { status: 'active' })).resolves.toEqual({
            sessionId: 12,
            status: 'active',
            sessionDate: '2026-08-16T19:30:00.000Z',
        })
        expect(database.updateMeetStatus).toHaveBeenCalledWith(12, 'scheduled', 'active', undefined)
    })

    it('moves the date of a night started before it to now', async () => {
        vi.useFakeTimers({ now: new Date('2026-08-10T18:00:00.000Z') })
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionStatus(1, 12, { status: 'active' })).resolves.toEqual({
            sessionId: 12,
            status: 'active',
            sessionDate: '2026-08-10T18:00:00.000Z',
        })
        expect(database.updateMeetStatus).toHaveBeenCalledWith(12, 'scheduled', 'active', '2026-08-10T18:00:00.000Z')
        vi.useRealTimers()
    })

    it('keeps the date of a cancelled night, even a future one', async () => {
        vi.useFakeTimers({ now: new Date('2026-08-10T18:00:00.000Z') })
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await service.updateSessionStatus(1, 12, { status: 'cancelled' })
        expect(database.updateMeetStatus).toHaveBeenCalledWith(12, 'scheduled', 'cancelled', undefined)
        vi.useRealTimers()
    })

    it('refuses to finish a night with no game played unless the organizer confirms it', async () => {
        const database = createDatabaseMock()

        database.getMeetAccessForAccount.mockResolvedValue({
            rows: [[12, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'active', 'Europe/Madrid', null]],
        })
        database.countPlayedMeetGames.mockResolvedValue({ rows: [{ played: 0 }] })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionStatus(1, 12, { status: 'completed' })).rejects.toThrow('No game is marked as played')
        expect(database.updateMeetStatus).not.toHaveBeenCalled()

        await expect(service.updateSessionStatus(1, 12, { status: 'completed', noGamesPlayed: true })).resolves.toEqual(
            expect.objectContaining({ status: 'completed' }),
        )
    })

    it('requires a scheduled session to become active before it can be completed', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionStatus(1, 12, { status: 'completed' })).rejects.toThrow(
            'Cannot change a scheduled session to completed',
        )
        expect(database.updateMeetStatus).not.toHaveBeenCalled()
    })

    it('rejects invalid lifecycle transitions', async () => {
        const database = createDatabaseMock()

        database.getMeetAccessForAccount.mockResolvedValue({ rows: [[12, 7, 1, '2026-08-16T19:30:00.000Z', 1, 'completed', 'UTC', null]] })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionStatus(1, 12, { status: 'active' })).rejects.toThrow(BadRequestException)
        expect(database.updateMeetStatus).not.toHaveBeenCalled()
    })

    describe('who may do what (ADR-0019)', () => {
        // Session 12 in group 7, planned by account 1; the actor is account 2.
        const accessRow = (isGroupOwner: 0 | 1, myRsvpStatus: string | null, status = 'scheduled') => ({
            rows: [[12, 7, 1, '2026-08-16T19:30:00.000Z', 0, status, 'Europe/Madrid', null, isGroupOwner, myRsvpStatus]],
        })
        const asActor = (row: ReturnType<typeof accessRow> | { rows: [] }) => {
            const database = createDatabaseMock()

            database.getMeetAccessForAccount.mockResolvedValue(row)
            return { database, service: new SessionsService(fakeDatabase(database)) }
        }

        it('lets an invitee who is coming start the night, but not cancel it', async () => {
            const { database, service } = asActor(accessRow(0, 'accepted'))

            await expect(service.updateSessionStatus(2, 12, { status: 'cancelled' })).rejects.toThrow(ForbiddenException)
            await expect(service.updateSessionStatus(2, 12, { status: 'active' })).resolves.toMatchObject({ status: 'active' })
            expect(database.updateMeetStatus).toHaveBeenCalledTimes(1)
            expect(database.markPlayersAttended).toHaveBeenCalledWith(12)
        })

        it('keeps someone who declined, or was not invited, from running the night', async () => {
            for (const rsvp of ['declined', null]) {
                const { database, service } = asActor(accessRow(0, rsvp))

                await expect(service.updateSessionStatus(2, 12, { status: 'active' })).rejects.toThrow(ForbiddenException)
                await expect(service.updateSessionPlayedGames(2, 12, { playedGameIds: [42] })).rejects.toThrow(ForbiddenException)
                await expect(service.updateSessionAttendance(2, 12, { attendedIds: [1] })).rejects.toThrow(ForbiddenException)
                expect(database.updateMeetStatus).not.toHaveBeenCalled()
            }
        })

        it('keeps the invite list and the shortlist with the organizer', async () => {
            const { service } = asActor(accessRow(0, 'accepted'))

            await expect(service.updateSessionAttendees(2, 12, { attendeeIds: [1, 2] })).rejects.toThrow(ForbiddenException)
            await expect(service.updateSessionShortlist(2, 12, { plannedGameIds: [42] })).rejects.toThrow(ForbiddenException)
        })

        it('treats the group owner as an organizer of every night in the group', async () => {
            const { database, service } = asActor(accessRow(1, null))

            await expect(service.updateSessionShortlist(2, 12, { plannedGameIds: [42] })).resolves.toEqual({
                sessionId: 12,
                plannedGameIds: [42],
            })
            await expect(service.updateSessionStatus(2, 12, { status: 'cancelled' })).resolves.toMatchObject({ status: 'cancelled' })
            expect(database.markPlayersAttended).not.toHaveBeenCalled()
        })

        it('answers 404 for a night outside the actor’s groups', async () => {
            const { service } = asActor({ rows: [] })

            await expect(service.updateSessionStatus(2, 12, { status: 'cancelled' })).rejects.toThrow(NotFoundException)
        })
    })

    it('replaces attendees for an organizer-owned active session', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionAttendees(1, 12, { attendeeIds: [1, 3] })).resolves.toEqual({
            sessionId: 12,
            attendeeIds: [1, 3],
        })
        expect(database.replaceMeetAttendees).toHaveBeenCalledWith(12, [1, 3], 'scheduled')
    })

    it('rejects attendee replacement when a target is outside the group', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionAttendees(1, 12, { attendeeIds: [1, 99] })).rejects.toThrow(BadRequestException)
        expect(database.replaceMeetAttendees).not.toHaveBeenCalled()
    })

    it('rejects replacing attendees with an empty set', async () => {
        const database = createDatabaseMock()
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionAttendees(1, 12, { attendeeIds: [] })).rejects.toThrow(
            'A session must retain at least one attendee',
        )
        expect(database.replaceMeetAttendees).not.toHaveBeenCalled()
    })

    it('does not remove a participant from the attendee list after a game is recorded', async () => {
        const database = createDatabaseMock()

        database.getMeetPlayedGameParticipants.mockResolvedValue([{ gameId: 42, participantIds: [2] }])
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionAttendees(1, 12, { attendeeIds: [1] })).rejects.toThrow(
            'A member who played a recorded game cannot be removed from the session attendees',
        )
        expect(database.replaceMeetAttendees).not.toHaveBeenCalled()
    })

    it('rejects attendee replacement on a completed session', async () => {
        const database = createDatabaseMock()

        database.getMeetAccessForAccount.mockResolvedValue({ rows: [[12, 7, 1, '2026-08-16T19:30:00.000Z', 1, 'completed', 'UTC', null]] })
        const service = new SessionsService(fakeDatabase(database))

        await expect(service.updateSessionAttendees(1, 12, { attendeeIds: [1] })).rejects.toThrow(BadRequestException)
        expect(database.replaceMeetAttendees).not.toHaveBeenCalled()
    })

    describe('game results', () => {
        const visibleSession = { rows: [[12, 7, 1, '2026-08-16T19:30:00.000Z', 0, 'completed', 'Europe/Madrid', null]] }
        const setup = (
            participants: { played: boolean; accountIds: Array<number>; personIds: Array<number> } = {
                played: true,
                accountIds: [],
                personIds: [10, 11, 12],
            },
        ) => {
            const database = {
                ...createDatabaseMock(),
                getMeetByIdForAccount: vi.fn().mockResolvedValue(visibleSession),
                getPlayedGameParticipantIds: vi.fn().mockResolvedValue(participants),
                replaceGameResults: vi.fn().mockResolvedValue(undefined),
            }

            return { database, service: new SessionsService(fakeDatabase(database)) }
        }

        it('records several winners and keeps scores, also on a completed session', async () => {
            const { database, service } = setup()

            await expect(
                service.updateGameResults(2, 12, 42, {
                    results: [
                        { groupPersonId: 10, isWinner: true, score: 31 },
                        { groupPersonId: 11, isWinner: true, score: 31 },
                        { groupPersonId: 12, isWinner: false, score: 18 },
                    ],
                }),
            ).resolves.toEqual({
                sessionId: 12,
                gameId: 42,
                results: [
                    { accountId: null, groupPersonId: 10, isWinner: true, score: 31 },
                    { accountId: null, groupPersonId: 11, isWinner: true, score: 31 },
                    { accountId: null, groupPersonId: 12, isWinner: false, score: 18 },
                ],
            })
            expect(database.getMeetByIdForAccount).toHaveBeenCalledWith(12, 2)
        })

        it('stores nothing for a loser without a score, so nobody winning is an empty set', async () => {
            const { database, service } = setup()

            await service.updateGameResults(2, 12, 42, { results: [{ groupPersonId: 10, isWinner: false }] })

            expect(database.replaceGameResults).toHaveBeenCalledWith(12, 42, [])
        })

        it('records winners for sessions kept with accounts', async () => {
            const { database, service } = setup({ played: true, accountIds: [1, 2], personIds: [] })

            await service.updateGameResults(2, 12, 42, { results: [{ accountId: 2, isWinner: true }] })

            expect(database.replaceGameResults).toHaveBeenCalledWith(12, 42, [
                { accountId: 2, groupPersonId: null, isWinner: true, score: null },
            ])
        })

        it('hides the session from non-members', async () => {
            const { database, service } = setup()

            database.getMeetByIdForAccount.mockResolvedValue({ rows: [] })

            await expect(service.updateGameResults(99, 12, 42, { results: [] })).rejects.toThrow(NotFoundException)
            expect(database.replaceGameResults).not.toHaveBeenCalled()
        })

        it.each([
            ['a game that was not played', { played: false, accountIds: [], personIds: [10] }, [{ groupPersonId: 10, isWinner: true }]],
            ['someone who did not play it', undefined, [{ groupPersonId: 99, isWinner: true }]],
            ['a result with both kinds of id', undefined, [{ groupPersonId: 10, accountId: 1, isWinner: true }]],
            ['a result with no id', undefined, [{ isWinner: true }]],
            [
                'the same person twice',
                undefined,
                [
                    { groupPersonId: 10, isWinner: true },
                    { groupPersonId: 10, isWinner: false },
                ],
            ],
        ])('rejects %s', async (_case, participants, results) => {
            const { database, service } = setup(participants)

            await expect(service.updateGameResults(2, 12, 42, { results })).rejects.toThrow(BadRequestException)
            expect(database.replaceGameResults).not.toHaveBeenCalled()
        })
    })
})
