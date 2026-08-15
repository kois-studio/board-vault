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
})
