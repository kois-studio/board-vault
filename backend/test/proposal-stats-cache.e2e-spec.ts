import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { cacheKeys } from './../src/modules/common/cache/cache-keys.js'
import { CacheService } from './../src/modules/common/cache/cache.service.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'proposal-stats-cache.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

/** Keeps what is set until it is deleted, as Redis does within a TTL. Rate limits stay off, as without Redis. */
class MemoryCache {
    readonly entries = new Map<string, unknown>()

    isEnabled = () => true
    checkHealth = async () => 'up' as const
    get = async (key: string) => structuredClone(this.entries.get(key) ?? null)
    set = async (key: string, data: unknown) => void this.entries.set(key, structuredClone(data))
    deleteOne = async (key: string) => this.entries.delete(key)
    deleteCachedData = async () => (this.entries.clear(), true)
    deleteAll = async () => (this.entries.clear(), true)
    keys = async () => ({ keys: [...this.entries.keys()] })
    increment = async () => null
}

/**
 * #295: the submissions page reads its counts again right after a proposal is sent, and they are
 * kept for an hour. Sending or deleting a proposal must clear them, as reviewing one already did.
 */
describe('proposal counts with the cache on (e2e)', () => {
    let app: INestApplication
    const cache = new MemoryCache()
    const asProposer = { Authorization: `Bearer ${sessionFor('user_proposer')}` }
    const asAdmin = { Authorization: `Bearer ${sessionFor('user_admin')}` }

    beforeAll(async () => {
        rmSync(testDatabasePath, { force: true })
        const schema = readFileSync(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8')

        execFileSync('sqlite3', [testDatabasePath], { input: schema, encoding: 'utf8' })
        execFileSync(process.execPath, [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
            cwd: repositoryRoot,
            env: { ...process.env, TURSO_DATABASE_URL: `file:${testDatabasePath}`, TURSO_AUTH_TOKEN: '', MIGRATION_BASELINE: '0005' },
            encoding: 'utf8',
        })
        execFileSync('sqlite3', [testDatabasePath], {
            input: `
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                    (1, 'admin@example.test', 'admin', ${avatar}, 'Admin', 'user_admin', 1, 0),
                    (2, 'proposer@example.test', 'proposer', ${avatar}, 'Proposer', 'user_proposer', 0, 0);
            `,
            encoding: 'utf8',
        })

        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = ''
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(ClerkTokenVerifier)
            .useValue(new FakeClerkTokenVerifier())
            .overrideProvider(CacheService)
            .useValue(cache)
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    const server = () => request(app.getHttpServer())
    const counts = async () => {
        const stats = (await server().get('/profile/users/2/proposal-stats').set(asProposer).expect(200)).body

        return { total: stats.totalProposals, pending: stats.pendingProposals, rejected: stats.rejectedProposals }
    }
    const propose = async (title: string) =>
        Number(
            (
                await server()
                    .post('/profile/users/2/proposals')
                    .set(asProposer)
                    .send({ title, minPlayers: 2, maxPlayers: 4, gameAvgDuration: 30 })
                    .expect(201)
            ).body.id,
        )

    it('counts a proposal as soon as it is sent, though the counts were kept', async () => {
        await propose('Azul')
        expect(await counts()).toEqual({ total: 1, pending: 1, rejected: 0 })
        expect(cache.entries.has(cacheKeys.proposalStats(2))).toBe(true)

        await propose('Catan')
        expect(await counts()).toEqual({ total: 2, pending: 2, rejected: 0 })
    })

    it('still counts a reviewed proposal at once', async () => {
        const proposalId = await propose('Love Letter')

        expect(await counts()).toEqual({ total: 3, pending: 3, rejected: 0 })
        await server().post(`/admin/proposals/${proposalId}/reject`).set(asAdmin).send({ reviewNotes: 'Not a board game.' }).expect(201)
        expect(await counts()).toEqual({ total: 3, pending: 2, rejected: 1 })
    })

    it('stops counting a proposal an admin deleted', async () => {
        const proposalId = await propose('Codenames')

        expect(await counts()).toEqual({ total: 4, pending: 3, rejected: 1 })
        await server().delete(`/admin/proposals/${proposalId}`).set(asAdmin).expect(200, { success: true })
        expect(await counts()).toEqual({ total: 3, pending: 2, rejected: 1 })
    })

    it('still answers success for a proposal that is already gone, and leaves the counts alone', async () => {
        const keptBefore = cache.entries.get(cacheKeys.proposalStats(2))

        await server().delete('/admin/proposals/9999').set(asAdmin).expect(200, { success: true })
        expect(cache.entries.get(cacheKeys.proposalStats(2))).toEqual(keptBefore)
    })
})
