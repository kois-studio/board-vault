import { DatabaseService } from './database.service'

import type { ConfigService } from '@nestjs/config'

describe('DatabaseService logging', () => {
    it('logs only the parameterized SQL template, never bound values', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rows: [] })
        const logger = jest.spyOn((service as unknown as { LOGGER: { log: (message: string) => void } }).LOGGER, 'log')
        const statement = {
            sql: 'SELECT * FROM Account WHERE email = ? AND password_reset_token = ?',
            args: ['person@example.com', 'reset-token-secret'],
        }

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await (service as unknown as { _tursoExecute: (stmt: typeof statement) => Promise<unknown> })._tursoExecute(statement)

        expect(execute).toHaveBeenCalledWith(statement)
        expect(logger).toHaveBeenCalledWith(statement.sql)
        expect(logger).not.toHaveBeenCalledWith(expect.stringContaining('person@example.com'))
        expect(logger).not.toHaveBeenCalledWith(expect.stringContaining('reset-token-secret'))
    })

    it('allows a verified identity migration to replace a prior Clerk instance link', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rowsAffected: 1 })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.linkUserToClerkId(1, 'user_production')

        expect(execute).toHaveBeenCalledWith({
            sql: 'UPDATE Account SET clerkUserId = ? WHERE id = ? AND (clerkUserId IS NULL OR clerkUserId <> ?)',
            args: ['user_production', 1, 'user_production'],
        })
    })

    it('builds recommendation candidates from selected attendee ownership', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rows: [] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.getRecommendationCandidates([1, 2], 2, 120)

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('INNER JOIN OwnedGame ownedByAttendee'),
            args: [1, 2, 1, 2, 1, 2, 1, 2, 1, 2, 2, 2, 120],
        })
    })

    it('stores recommendation feedback with its selected-attendee context', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rowsAffected: 1 })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.createRecommendationFeedback({
            accountId: 1,
            groupId: 7,
            gameId: 42,
            attendeeIds: '[1,2]',
            feedback: 'not_for_us',
        })

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('INSERT INTO RecommendationFeedback'),
            args: [1, 7, 42, '[1,2]', 'not_for_us'],
        })
    })

    it('guards group acquisition interest against games already owned by a member', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rowsAffected: 1 })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.addGroupGameInterest(7, 1, { gameId: 42 })

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('WHERE NOT EXISTS'),
            args: [7, 1, 42, 7, 42],
        })
    })

    it('accepts an invitation by creating membership and consuming the invitation in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest
                .fn()
                .mockResolvedValueOnce({ rows: [[42]] })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.acceptInvitationAtomically(42, 7, 12)).resolves.toEqual({ success: true })
        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: expect.stringContaining('SELECT id'),
            args: [42, 12, 7],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: 'INSERT OR IGNORE INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
            args: [7, 12],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(3, {
            sql: expect.stringContaining('DELETE FROM Invitation'),
            args: [42, 12, 7],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('does not resolve soft-deleted accounts for username invitations', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rows: [] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await expect(service.createInvitationByUsername({ groupId: 12, fromAccountId: 7, username: 'former-member' })).rejects.toThrow(
            'User not found',
        )

        expect(execute).toHaveBeenCalledWith({
            sql: 'SELECT * FROM Account WHERE username = ? AND isDeleted = 0',
            args: ['former-member'],
        })
        expect(execute).toHaveBeenCalledTimes(1)
    })

    it('rolls back invitation acceptance when the membership write fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest
                .fn()
                .mockResolvedValueOnce({ rows: [[42]] })
                .mockRejectedValueOnce(new Error('membership write failed')),
            commit: jest.fn(),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.acceptInvitationAtomically(42, 7, 12)).rejects.toThrow('membership write failed')
        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('reads recommendation feedback with only current group-member identity fields', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rows: [] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.getRecommendationFeedbackForGroup(7)

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('INNER JOIN GroupMembership'),
            args: [7],
        })
        expect(execute.mock.calls[0][0].sql).toContain('a.username')
        expect(execute.mock.calls[0][0].sql).not.toContain('a.email')
    })

    it('reads only organizer-recorded attendees for session history', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rows: [[1], [3]] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await expect(service.getMeetAttendedAccountIds(12)).resolves.toEqual([1, 3])
        expect(execute).toHaveBeenCalledWith({
            sql: "SELECT accountId FROM MeetAttendee WHERE meetId = ? AND attendanceStatus = 'attended'",
            args: [12],
        })
    })

    it('uses recorded attendance for personal history and only falls back to legacy play links without an attendee row', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rows: [[12], [10]] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await expect(service.getDistinctCompletedMeetIdsForAccountHistory(7)).resolves.toEqual([12, 10])
        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining("m.status = 'completed'"),
            args: [7, 7, 7],
        })
        expect(execute.mock.calls[0][0].sql).toContain("ma.attendanceStatus = 'attended'")
    })

    it('requires a session organizer to remain a member of the private group', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rows: [] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.getMeetByIdForCreator(12, 7)

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('INNER JOIN GroupMembership gm'),
            args: [7, 12, 7],
        })
    })

    it('builds recommendation diagnostics for the empty-state explanation', async () => {
        const service = new DatabaseService({} as ConfigService)
        const execute = jest.fn().mockResolvedValue({ rows: [[4, 2, 0]] })

        ;(service as unknown as { tursoClient: { execute: typeof execute } }).tursoClient = { execute }

        await service.getRecommendationCandidateCounts([1, 2], 2, 60)

        expect(execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('durationFitCount'),
            args: [2, 2, 2, 2, 60, 1, 2],
        })
    })

    it('writes a completed session and its relations using the captured meet id', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockResolvedValue({ lastInsertRowid: 42 }),
            batch: jest.fn().mockResolvedValue([]),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await service.createCompletedSession({
            groupId: 7,
            createdBy: 1,
            sessionDate: '2026-08-16T19:30:00.000Z',
            timezone: 'Europe/Madrid',
            notes: 'A rematch after the campaign finale.',
            attendeeIds: [1, 2],
            games: [{ gameId: 42, participantIds: [1, 2] }],
        })

        expect(transaction.execute).toHaveBeenCalledWith({
            sql: expect.stringContaining(
                'INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone, notes, updatedAt)',
            ),
            args: [7, 1, '2026-08-16T19:30:00.000Z', 'Europe/Madrid', 'A rematch after the campaign finale.'],
        })
        expect(transaction.batch).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ args: [42, 1] }),
                expect.objectContaining({ args: [42, 2] }),
                expect.objectContaining({ args: [42, 42] }),
                expect.objectContaining({ args: [42, 1, 42] }),
            ]),
        )
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('rolls back and closes the transaction when a session write fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockRejectedValue(new Error('write failed')),
            batch: jest.fn(),
            commit: jest.fn(),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(
            service.createCompletedSession({
                groupId: 7,
                createdBy: 1,
                sessionDate: '2026-08-16T19:30:00.000Z',
                timezone: 'Europe/Madrid',
                attendeeIds: [1],
                games: [{ gameId: 42, participantIds: [1] }],
            }),
        ).rejects.toThrow('write failed')

        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('joins a provisioned Clerk account only to the inviter-owned group', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest
                .fn()
                .mockResolvedValueOnce({ rows: [[12]] })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await service.joinGroupFromClerkInvitation(9, { groupId: 12, inviterAccountId: 7, version: 1 })

        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: 'SELECT id FROM UserGroup WHERE id = ? AND createdBy = ?',
            args: [12, 7],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: 'INSERT OR IGNORE INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
            args: [9, 12],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('creates a group and owner membership in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockResolvedValueOnce({ lastInsertRowid: 77 }).mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.createGroupWithMembership({ name: 'Friends / Friday', createdBy: 7 })).resolves.toEqual({ groupId: 77 })

        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: 'INSERT INTO UserGroup (name, createdBy) VALUES (?, ?)',
            args: ['Friends / Friday', 7],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (?, ?)',
            args: [7, 77],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('rolls back group creation when owner membership fails', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockResolvedValueOnce({ lastInsertRowid: 77 }).mockRejectedValueOnce(new Error('membership write failed')),
            commit: jest.fn(),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.createGroupWithMembership({ name: 'Friends', createdBy: 7 })).rejects.toThrow('membership write failed')

        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('replaces session attendees in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
            batch: jest.fn().mockResolvedValue([]),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.replaceMeetAttendees(12, [1, 3], 'scheduled')).resolves.toBe(true)

        expect(transaction.execute).toHaveBeenCalledWith({
            sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
            args: [12, 'scheduled'],
        })
        expect(transaction.execute).toHaveBeenCalledWith({
            sql: 'DELETE FROM MeetAttendee WHERE meetId = ? AND accountId NOT IN (?, ?)',
            args: [12, 1, 3],
        })
        expect(transaction.batch).toHaveBeenCalledWith([
            expect.objectContaining({ args: [12, 1] }),
            expect.objectContaining({ args: [12, 3] }),
        ])
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('replaces planned session games atomically and allows clearing the shortlist', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
            batch: jest.fn().mockResolvedValue([]),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.replaceMeetPlannedGames(12, [42, 43], 'active')).resolves.toBe(true)
        expect(transaction.execute).toHaveBeenCalledWith({
            sql: 'UPDATE Meet SET updatedAt = CURRENT_TIMESTAMP WHERE id = ? AND status = ?',
            args: [12, 'active'],
        })
        expect(transaction.execute).toHaveBeenCalledWith({
            sql: "DELETE FROM MeetGame WHERE meetId = ? AND gameStatus = 'planned'",
            args: [12],
        })
        expect(transaction.batch).toHaveBeenCalledWith([
            expect.objectContaining({ args: [12, 42] }),
            expect.objectContaining({ args: [12, 43] }),
        ])
        expect(transaction.commit).toHaveBeenCalledTimes(1)

        transaction.execute.mockClear()
        transaction.batch.mockClear()
        await expect(service.replaceMeetPlannedGames(12, [], 'active')).resolves.toBe(true)
        expect(transaction.batch).not.toHaveBeenCalled()
        expect(transaction.commit).toHaveBeenCalledTimes(2)
    })

    it('rolls back session attendee replacement when inserts fail', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
            batch: jest.fn().mockRejectedValue(new Error('attendee write failed')),
            commit: jest.fn(),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.replaceMeetAttendees(12, [1, 3], 'active')).rejects.toThrow('attendee write failed')
        expect(transaction.rollback).toHaveBeenCalledTimes(1)
        expect(transaction.commit).not.toHaveBeenCalled()
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('writes scheduled attendees as pending in one transaction', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockResolvedValue({ lastInsertRowid: 43 }),
            batch: jest.fn().mockResolvedValue([]),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(
            service.createScheduledSession({
                groupId: 7,
                createdBy: 1,
                sessionDate: '2026-08-21T19:30:00.000Z',
                timezone: 'Europe/Madrid',
                attendeeIds: [1, 2],
                plannedGameIds: [42],
            }),
        ).resolves.toEqual({ lastInsertRowid: 43 })

        expect(transaction.execute).toHaveBeenCalledWith({
            sql: expect.stringContaining("VALUES (?, ?, ?, FALSE, 'scheduled', ?, ?, CURRENT_TIMESTAMP)"),
            args: [7, 1, '2026-08-21T19:30:00.000Z', 'Europe/Madrid', null],
        })
        expect(transaction.batch).toHaveBeenCalledWith(
            expect.arrayContaining([
                expect.objectContaining({ args: [43, 1] }),
                expect.objectContaining({ args: [43, 2] }),
                expect.objectContaining({ args: [43, 42] }),
            ]),
        )
        expect(transaction.commit).toHaveBeenCalledTimes(1)
    })

    it('keeps legacy play links and canonical played games synchronized', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest
                .fn()
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 })
                .mockResolvedValueOnce({ rowsAffected: 1 }),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.createMeetAccountGame(1, 12, 42)).resolves.toEqual({ rowsAffected: 1 })
        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: expect.stringContaining('INSERT OR IGNORE INTO MeetGame'),
            args: [12, 42],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: expect.stringContaining("SET gameStatus = 'played'"),
            args: [12, 42],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(3, {
            sql: 'INSERT OR IGNORE INTO MeetAccountGame (accountId, meetId, gameId) VALUES (?, ?, ?)',
            args: [1, 12, 42],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
    })

    it('marks remaining planned games as skipped when a session becomes terminal', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockResolvedValueOnce({ rowsAffected: 1 }).mockResolvedValueOnce({ rowsAffected: 2 }),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.updateMeetStatus(12, 'active', 'completed')).resolves.toEqual({ rowsAffected: 1 })

        expect(transaction.execute).toHaveBeenNthCalledWith(1, {
            sql: expect.stringContaining('SET status = ?'),
            args: ['completed', true, 12, 'active'],
        })
        expect(transaction.execute).toHaveBeenNthCalledWith(2, {
            sql: expect.stringContaining("SET gameStatus = 'skipped'"),
            args: [12],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.close).toHaveBeenCalledTimes(1)
    })

    it('does not rewrite planned games while a session remains active', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockResolvedValue({ rowsAffected: 1 }),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.updateMeetStatus(12, 'scheduled', 'active')).resolves.toEqual({ rowsAffected: 1 })

        expect(transaction.execute).toHaveBeenCalledTimes(1)
        expect(transaction.commit).toHaveBeenCalledTimes(1)
    })

    it('does not mark planned games skipped when a concurrent status change wins', async () => {
        const service = new DatabaseService({} as ConfigService)
        const transaction = {
            execute: jest.fn().mockResolvedValue({ rowsAffected: 0 }),
            commit: jest.fn().mockResolvedValue(undefined),
            rollback: jest.fn().mockResolvedValue(undefined),
            close: jest.fn(),
        }

        ;(service as unknown as { tursoClient: unknown }).tursoClient = {
            transaction: jest.fn().mockResolvedValue(transaction),
        }

        await expect(service.updateMeetStatus(12, 'scheduled', 'cancelled')).resolves.toEqual({ rowsAffected: 0 })

        expect(transaction.execute).toHaveBeenCalledTimes(1)
        expect(transaction.commit).toHaveBeenCalledTimes(1)
        expect(transaction.rollback).not.toHaveBeenCalled()
    })
})
