import { HealthService } from './health.service.js'

describe('HealthService', () => {
    it('returns liveness without contacting dependencies', () => {
        const databaseService = { checkHealth: vi.fn(), hasCurrentSchema: vi.fn() }
        const cacheService = { checkHealth: vi.fn() }
        const service = new HealthService(databaseService as never, cacheService as never)

        expect(service.getLiveness()).toEqual({ status: 'ok' })
        expect(databaseService.checkHealth).not.toHaveBeenCalled()
        expect(cacheService.checkHealth).not.toHaveBeenCalled()
    })

    it('reports a ready state when the database is up and cache is disabled locally', async () => {
        const databaseService = { checkHealth: vi.fn().mockResolvedValue(undefined), hasCurrentSchema: vi.fn().mockResolvedValue(true) }
        const cacheService = { checkHealth: vi.fn().mockResolvedValue('disabled') }
        const service = new HealthService(databaseService as never, cacheService as never)

        await expect(service.getReadiness()).resolves.toEqual({
            status: 'ready',
            checks: { database: 'up', cache: 'disabled', schema: 'up' },
        })
    })

    it('reports not_ready without exposing dependency error details', async () => {
        const databaseService = {
            checkHealth: vi.fn().mockRejectedValue(new Error('TURSO_AUTH_TOKEN=secret')),
            hasCurrentSchema: vi.fn(),
        }
        const cacheService = { checkHealth: vi.fn().mockResolvedValue('down') }
        const service = new HealthService(databaseService as never, cacheService as never)

        await expect(service.getReadiness()).resolves.toEqual({
            status: 'not_ready',
            checks: { database: 'down', cache: 'down', schema: 'down' },
        })
    })

    it('reports not_ready when the database is reachable but behind the current schema', async () => {
        const databaseService = {
            checkHealth: vi.fn().mockResolvedValue(undefined),
            hasCurrentSchema: vi.fn().mockResolvedValue(false),
        }
        const cacheService = { checkHealth: vi.fn().mockResolvedValue('disabled') }
        const service = new HealthService(databaseService as never, cacheService as never)

        await expect(service.getReadiness()).resolves.toEqual({
            status: 'not_ready',
            checks: { database: 'up', cache: 'disabled', schema: 'down' },
        })
    })
})
