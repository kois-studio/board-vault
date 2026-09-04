import { HealthService } from './health.service'

describe('HealthService', () => {
    it('returns liveness without contacting dependencies', () => {
        const databaseService = { checkHealth: jest.fn() }
        const cacheService = { checkHealth: jest.fn() }
        const service = new HealthService(databaseService as never, cacheService as never)

        expect(service.getLiveness()).toEqual({ status: 'ok' })
        expect(databaseService.checkHealth).not.toHaveBeenCalled()
        expect(cacheService.checkHealth).not.toHaveBeenCalled()
    })

    it('reports a ready state when the database is up and cache is disabled locally', async () => {
        const databaseService = { checkHealth: jest.fn().mockResolvedValue(undefined) }
        const cacheService = { checkHealth: jest.fn().mockResolvedValue('disabled') }
        const service = new HealthService(databaseService as never, cacheService as never)

        await expect(service.getReadiness()).resolves.toEqual({
            status: 'ready',
            checks: { database: 'up', cache: 'disabled' },
        })
    })

    it('reports not_ready without exposing dependency error details', async () => {
        const databaseService = { checkHealth: jest.fn().mockRejectedValue(new Error('TURSO_AUTH_TOKEN=secret')) }
        const cacheService = { checkHealth: jest.fn().mockResolvedValue('down') }
        const service = new HealthService(databaseService as never, cacheService as never)

        await expect(service.getReadiness()).resolves.toEqual({
            status: 'not_ready',
            checks: { database: 'down', cache: 'down' },
        })
    })
})
