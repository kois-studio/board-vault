import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client, type ResultSet } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ACCOUNT_CACHE_TTL_MS, AccountCache } from './../src/modules/common/auth/account-cache.js'
import { ClerkIdentityService } from './../src/modules/common/auth/clerk-identity.service.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { DatabaseService } from './../src/modules/common/database/database.service.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

import type { Mock } from 'vitest'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'account-resolution-cache.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

const auth = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

/**
 * #250: each instance remembers for a minute which account a Clerk session belongs to. A burst of
 * requests reads the account once; a deletion made on this instance is seen at once; a change made
 * straight in the database (the admin flag) is seen within the minute.
 */
describe('account resolution cache (e2e)', () => {
    let app: INestApplication
    let database: Client
    let accountCache: AccountCache
    let accountReads: Mock<(clerkUserId: string) => Promise<ResultSet>>
    let clock: number

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
                    (1, 'carlos@example.test', 'carlos', ${avatar}, 'Carlos', 'user_carlos', 0, 0),
                    (2, 'mario@example.test', 'mario', ${avatar}, 'Mario', 'user_mario', 0, 0),
                    (3, 'jose@example.test', 'jose', ${avatar}, 'Jose', 'user_jose', 0, 0);
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
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
        app.get(ClerkIdentityService).deleteClerkUser = vi.fn().mockResolvedValue(undefined)
        app.get(ClerkIdentityService).revokeInvitationsFrom = vi.fn().mockResolvedValue({ revoked: 0, failed: 0 })
        accountCache = app.get(AccountCache)
        clock = Date.now()
        accountCache.now = () => clock
        const accounts = app.get(DatabaseService).accounts

        // Counts the account reads (SELECT … FROM Account WHERE clerkUserId = ?) and still runs them.
        const readAccount = accounts.getUserByClerkId.bind(accounts)

        accountReads = vi.fn((clerkUserId: string) => readAccount(clerkUserId))
        accounts.getUserByClerkId = accountReads
        database = createClient({ url: `file:${testDatabasePath}` })
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    beforeEach(() => {
        accountReads.mockClear()
    })

    const readsFor = (clerkUserId: string) => accountReads.mock.calls.filter(([id]) => id === clerkUserId).length

    it('reads the account once for a burst of requests, and again only after the TTL', async () => {
        const status = () => request(app.getHttpServer()).get('/auth/clerk/status').set(auth('user_carlos')).expect(200)

        const burst = await Promise.all(Array.from({ length: 10 }, status))

        expect(burst.map(response => response.body.userId)).toEqual(Array(10).fill(1))
        expect(readsFor('user_carlos')).toBe(1)

        clock += ACCOUNT_CACHE_TTL_MS - 1
        await status()
        expect(readsFor('user_carlos')).toBe(1)

        clock += 1
        await status()
        expect(readsFor('user_carlos')).toBe(2)
    })

    it('answers 401 to a deleted account on its very next request', async () => {
        await request(app.getHttpServer()).get('/auth/clerk/status').set(auth('user_mario')).expect(200)

        await request(app.getHttpServer()).delete('/auth/account').set(auth('user_mario')).expect(204)

        // Still inside the minute: the deletion itself made this instance forget the account.
        await request(app.getHttpServer()).get('/auth/clerk/status').set(auth('user_mario')).expect(401)
        await request(app.getHttpServer()).get('/users/2').set(auth('user_mario')).expect(401)
    })

    it('sees an admin flag set in the database within the TTL', async () => {
        const isAdmin = async () =>
            (await request(app.getHttpServer()).get('/auth/clerk/status').set(auth('user_jose')).expect(200)).body.isAdmin

        expect(await isAdmin()).toBe(false)
        await request(app.getHttpServer()).get('/admin/overview').set(auth('user_jose')).expect(403)

        // An operator grants it straight in the database, which no instance hears about.
        await database.execute('UPDATE Account SET isAdmin = 1 WHERE id = 3')
        expect(await isAdmin()).toBe(false)

        clock += ACCOUNT_CACHE_TTL_MS
        expect(await isAdmin()).toBe(true)
        await request(app.getHttpServer()).get('/admin/overview').set(auth('user_jose')).expect(200)

        // Taking it away is bounded the same way.
        await database.execute('UPDATE Account SET isAdmin = 0 WHERE id = 3')
        clock += ACCOUNT_CACHE_TTL_MS
        await request(app.getHttpServer()).get('/admin/overview').set(auth('user_jose')).expect(403)
    })

    it('does not remember a session it could not resolve', async () => {
        await request(app.getHttpServer()).get('/auth/clerk/status').set(auth('user_mario')).expect(401)
        await request(app.getHttpServer()).get('/auth/clerk/status').set(auth('user_mario')).expect(401)

        expect(readsFor('user_mario')).toBe(2)
    })
})
