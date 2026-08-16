import type { ConfigService } from '@nestjs/config'

import { DatabaseService } from './database.service'

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
            attendeeIds: [1, 2],
            games: [{ gameId: 42, participantIds: [1, 2] }],
        })

        expect(transaction.execute).toHaveBeenCalledWith({
            sql: expect.stringContaining('INSERT INTO Meet (groupId, createdBy, meetDate, isConfirmed, status, timezone, updatedAt)'),
            args: [7, 1, '2026-08-16T19:30:00.000Z', 'Europe/Madrid'],
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
            sql: expect.stringContaining("VALUES (?, ?, ?, FALSE, 'scheduled', ?, CURRENT_TIMESTAMP)"),
            args: [7, 1, '2026-08-21T19:30:00.000Z', 'Europe/Madrid'],
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
            execute: jest.fn().mockResolvedValueOnce({ rowsAffected: 1 }).mockResolvedValueOnce({ rowsAffected: 1 }),
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
            sql: 'INSERT OR IGNORE INTO MeetAccountGame (accountId, meetId, gameId) VALUES (?, ?, ?)',
            args: [1, 12, 42],
        })
        expect(transaction.commit).toHaveBeenCalledTimes(1)
    })
})
