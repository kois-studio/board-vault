import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { DatabaseService } from './../src/modules/common/database/database.service.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'notify-after-response.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const ana = { Authorization: `Bearer ${sessionFor('user_ana')}` }
const bruno = { Authorization: `Bearer ${sessionFor('user_bruno')}` }
/** Where @vercel/functions finds the request's `waitUntil`; set here as the Vercel runtime sets it. */
const VERCEL_REQUEST_CONTEXT = Symbol.for('@vercel/request-context')
const contexts = globalThis as Record<symbol, unknown>

/** A promise the test resolves when it lets the held work go on. */
function gate() {
    let open!: () => void
    const opened = new Promise<void>(resolve => (open = resolve))

    return { opened, open }
}

/**
 * #253: a write that notifies other people answers once its own change is saved. On Vercel the
 * notifications are sent after the response through `waitUntil`, and still arrive; anywhere else
 * they are awaited as before. The notification writes are held at a gate, so a response that
 * waited for them could not arrive.
 *
 * Ana (1) and Bruno (2) share Fridays (10).
 */
describe('notifications after the response (e2e)', () => {
    let app: INestApplication
    let database: Client
    let kept: Array<Promise<unknown>>
    let held: ReturnType<typeof gate>

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
                    (1, 'ana@example.test', 'anaplays', ${avatar}, 'Ana', 'user_ana', 0, 0),
                    (2, 'bruno@example.test', 'brunoplays', ${avatar}, 'Bruno', 'user_bruno', 0, 0);
                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 1);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10);
                INSERT INTO Game (id, imageUrl) VALUES (101, '');
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (101, 'en', 'Catan', 'catan');
                INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary)
                SELECT gameId, languageCode, title, normalizedTitle, 1 FROM GameTranslation;
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
        database = createClient({ url: `file:${testDatabasePath}` })

        // Every notification write waits at the gate of the test that is running.
        const notifications = app.get(DatabaseService).notifications

        for (const method of ['recordShelfChange', 'createNotifications'] as const) {
            const original = notifications[method].bind(notifications) as (...args: Array<unknown>) => Promise<unknown>

            vi.spyOn(notifications, method).mockImplementation((async (...args: Array<unknown>) => {
                await held.opened
                return original(...args)
            }) as never)
        }
    })

    beforeEach(() => {
        held = gate()
        kept = []
    })

    afterEach(async () => {
        held.open()
        await Promise.all(kept)
        delete contexts[VERCEL_REQUEST_CONTEXT]
    })

    afterAll(async () => {
        vi.restoreAllMocks()
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    const server = () => request(app.getHttpServer())
    const onVercel = () => {
        contexts[VERCEL_REQUEST_CONTEXT] = { get: () => ({ waitUntil: (promise: Promise<unknown>) => kept.push(promise) }) }
    }
    /** Lets the held notifications go and waits for what Vercel would have kept the function alive for. */
    const release = async () => {
        held.open()
        await Promise.all(kept)
    }
    const brunoHears = async (type: string) =>
        ((await server().get('/profile/users/2/notifications').set(bruno).expect(200)).body as Array<{ type: string; message: string }>)
            .filter(notification => notification.type === type)
            .map(notification => notification.message)
    const inTwoWeeks = () => new Date(Date.now() + 14 * 86_400_000).toISOString().replace(/\.\d{3}Z$/, '.000Z')

    it('adds and removes a shelf game without waiting for the notification, which still arrives', async () => {
        onVercel()

        await server().post('/collection/users/1/games/101').set(ana).expect(201)
        expect((await database.execute('SELECT COUNT(*) FROM OwnedGame WHERE accountId = 1 AND gameId = 101')).rows[0]?.[0]).toBe(1)
        expect(kept).toHaveLength(1)
        expect(await brunoHears('shelf_changed')).toEqual([])

        await release()
        expect(await brunoHears('shelf_changed')).toEqual(['Ana added Catan to their shelf.'])

        held = gate()
        await server().delete('/collection/users/1/games/101').set(ana).expect(200)
        expect((await database.execute('SELECT COUNT(*) FROM OwnedGame WHERE accountId = 1')).rows[0]?.[0]).toBe(0)
        expect(await brunoHears('shelf_changed')).toEqual(['Ana added Catan to their shelf.'])

        // Removed before Bruno read that it was added: the unread notification goes (shelf-notification.ts).
        await release()
        expect(await brunoHears('shelf_changed')).toEqual([])
    })

    it('plans and cancels a night without waiting for the notifications, which still arrive', async () => {
        onVercel()

        const planned = await server()
            .post('/sessions/scheduled')
            .set(ana)
            .send({ groupId: 10, sessionDate: inTwoWeeks(), timezone: 'Europe/Madrid' })
            .expect(201)
        const sessionId = Number(planned.body.sessionId)

        expect(planned.body.status).toBe('scheduled')
        expect(kept).toHaveLength(1)
        expect(await brunoHears('meeting_scheduled')).toEqual([])

        await release()
        expect(await brunoHears('meeting_scheduled')).toEqual([
            expect.stringMatching(/^Ana planned a game night in Fridays for .+\. Can you make it\?$/),
        ])

        held = gate()
        await server().patch(`/sessions/${sessionId}/status`).set(ana).send({ status: 'cancelled' }).expect(200)
        expect((await database.execute({ sql: 'SELECT status FROM Meet WHERE id = ?', args: [sessionId] })).rows[0]?.[0]).toBe('cancelled')
        expect(await brunoHears('session_cancelled')).toEqual([])

        await release()
        expect(await brunoHears('session_cancelled')).toEqual([expect.stringMatching(/^Ana cancelled the Fridays game night of .+\.$/)])
    })

    it('waits for the notification outside Vercel, as locally and in tests', async () => {
        const recordShelfChange = vi.mocked(app.get(DatabaseService).notifications.recordShelfChange)
        const callsBefore = recordShelfChange.mock.calls.length
        let answered = false
        const adding = server()
            .post('/collection/users/2/games/101')
            .set(bruno)
            .then(response => {
                answered = true
                return response
            })

        // The notification is at the gate; a response that did not wait for it would arrive now.
        await vi.waitFor(() => expect(recordShelfChange.mock.calls.length).toBe(callsBefore + 1))
        await new Promise(resolve => setTimeout(resolve, 200))
        expect(answered).toBe(false)

        held.open()
        expect((await adding).status).toBe(201)
        expect(kept).toEqual([])
        const anaHears = (await server().get('/profile/users/1/notifications').set(ana).expect(200)).body as Array<{
            type: string
            message: string
        }>

        expect(anaHears.filter(notification => notification.type === 'shelf_changed').map(notification => notification.message)).toEqual([
            'Bruno added Catan to their shelf.',
        ])
    })
})
