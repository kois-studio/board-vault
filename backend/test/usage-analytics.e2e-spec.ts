import { execFileSync } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkIdentityService } from './../src/modules/common/auth/clerk-identity.service.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { DatabaseService } from './../src/modules/common/database/database.service.js'
import { UsageService } from './../src/modules/core/usage/usage.service.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

import type { MockInstance } from 'vitest'

const repositoryRoot = resolve(__dirname, '../..')
/** Where the Vercel runtime puts the request's `waitUntil`; set here as the runtime sets it. */
const VERCEL_REQUEST_CONTEXT = Symbol.for('@vercel/request-context')
const contexts = globalThis as Record<symbol, unknown>
const testDatabasePath = resolve(__dirname, 'usage-analytics.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const secret = 'test-pseudonym-secret'
const pseudonym = (accountId: number) => createHmac('sha256', secret).update(`account:${accountId}`).digest('hex').slice(0, 32)

// ADR-0021: our own usage statistics, pseudonymous for 30 days, anonymous after, nothing in the browser.
describe('usage analytics (e2e)', () => {
    let app: INestApplication

    // sqlite3 for Windows ends its lines with \r\n; the expectations are written with \n.
    const sql = (input: string) => execFileSync('sqlite3', [testDatabasePath], { input, encoding: 'utf8' }).replace(/\r\n/g, '\n').trim()

    beforeAll(async () => {
        rmSync(testDatabasePath, { force: true })
        sql(readFileSync(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8'))
        execFileSync(process.execPath, [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
            cwd: repositoryRoot,
            env: { ...process.env, TURSO_DATABASE_URL: `file:${testDatabasePath}`, TURSO_AUTH_TOKEN: '', MIGRATION_BASELINE: '0005' },
            encoding: 'utf8',
        })
        // Ada is an admin; Bea and Cai are members of Fridays.
        sql(`
            INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                (1, 'ada@example.test', 'adaplays', ${avatar}, 'Ada', 'user_ada', 1, 0),
                (2, 'bea@example.test', 'beaplays', ${avatar}, 'Bea', 'user_bea', 0, 0),
                (3, 'cai@example.test', 'caiplays', ${avatar}, 'Cai', 'user_cai', 0, 0);
            INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 2);
            INSERT INTO GroupMembership (accountId, groupId) VALUES (2, 10), (3, 10);
            INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (1, 'https://example.test/azul.jpg', 45, 2, 4);
            INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES (1, 'en', 'Azul', 'azul', 1);
        `)

        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = ''
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'
        process.env.USAGE_PSEUDONYM_SECRET = secret
        process.env.CRON_SECRET = 'test-cron-secret'

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(ClerkTokenVerifier)
            .useValue(new FakeClerkTokenVerifier())
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
        app.get(ClerkIdentityService).deleteClerkUser = async () => undefined
    })

    afterAll(async () => {
        delete process.env.USAGE_PSEUDONYM_SECRET
        delete process.env.CRON_SECRET
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
    const http = () => request(app.getHttpServer())
    const events = () => sql("SELECT name, pseudonym, COALESCE(view, '-'), COALESCE(fromView, '-') FROM UsageEvent ORDER BY id;")

    it('counts a page view under a pseudonym, never the account id', async () => {
        await http().post('/navigation').set(as('user_bea')).send({ page: '/play/history', from: '/play' }).expect(204)

        expect(events()).toBe(`page_viewed|${pseudonym(2)}|/play/history|/play`)
        expect(sql("SELECT COUNT(*) FROM UsageEvent WHERE pseudonym = '2';")).toBe('0')
    })

    it('refuses pages that are addresses rather than route templates', async () => {
        await http().post('/navigation').set(as('user_bea')).send({ page: '/groups/10' }).expect(400)
        await http().post('/navigation').set(as('user_bea')).send({ page: '/groups/:groupId', from: '/u/bea@example.test' }).expect(400)
        await http().post('/navigation').send({ page: '/play' }).expect(401)
    })

    it('counts a successful action with the screen it came from, and ignores a bad screen', async () => {
        await http().post('/collection/users/2/games/1').set(as('user_bea')).set('X-Board-Vault-View', '/games/:gameId').expect(201)
        await http().post('/collection/users/2/reviews/1').set(as('user_bea')).set('X-Board-Vault-View', '/games/1').send({ review: 8 })

        expect(events().split('\n').slice(1)).toEqual([`game_added|${pseudonym(2)}|/games/:gameId|-`, `review_saved|${pseudonym(2)}|-|-`])
    })

    it('does not count a request that failed', async () => {
        const before = events()

        await http().post('/collection/users/3/games/1').set(as('user_bea')).expect(403)
        expect(events()).toBe(before)
    })

    it('stops counting and forgets recent events when someone turns it off', async () => {
        await http().post('/navigation').set(as('user_cai')).send({ page: '/play' }).expect(204)
        expect((await http().get('/settings/privacy').set(as('user_cai')).expect(200)).body).toEqual({
            usageAnalytics: true,
            noticeAnswered: false,
        })

        expect((await http().put('/settings/privacy').set(as('user_cai')).send({ usageAnalytics: false }).expect(200)).body).toEqual({
            usageAnalytics: false,
            noticeAnswered: true,
        })
        await http().post('/navigation').set(as('user_cai')).send({ page: '/collection' }).expect(204)

        expect(sql(`SELECT COUNT(*) FROM UsageEvent WHERE pseudonym = '${pseudonym(3)}';`)).toBe('0')
        expect((await http().get('/settings/privacy').set(as('user_cai')).expect(200)).body).toEqual({
            usageAnalytics: false,
            noticeAnswered: true,
        })

        await http().put('/settings/privacy').set(as('user_cai')).send({ usageAnalytics: true }).expect(200)
        await http().post('/navigation').set(as('user_cai')).send({ page: '/collection' }).expect(204)
        expect(sql(`SELECT COUNT(*) FROM UsageEvent WHERE pseudonym = '${pseudonym(3)}';`)).toBe('1')
    })

    it('asks once: whichever way someone answers the notice, it stays answered (#158)', async () => {
        await http().post('/navigation').set(as('user_bea')).send({ page: '/dashboard' }).expect(204)
        expect((await http().get('/settings/privacy').set(as('user_bea')).expect(200)).body.noticeAnswered).toBe(false)

        // Leaving it on answers it too, and keeps what was counted.
        await http().put('/settings/privacy').set(as('user_bea')).send({ usageAnalytics: true }).expect(200)

        expect((await http().get('/settings/privacy').set(as('user_bea')).expect(200)).body).toEqual({
            usageAnalytics: true,
            noticeAnswered: true,
        })
        expect(Number(sql(`SELECT COUNT(*) FROM UsageEvent WHERE pseudonym = '${pseudonym(2)}';`))).toBeGreaterThan(0)
        await http().put('/settings/privacy').set(as('user_ada')).send({ usageAnalytics: true }).expect(200)
        expect(sql('SELECT COUNT(*) FROM UsageNotice;')).toBe('3')
    })

    it('shows admins the report, with pages, ways in and funnels', async () => {
        await http().get('/admin/usage').set(as('user_bea')).expect(403)
        const report = (await http().get('/admin/usage').set(as('user_ada')).expect(200)).body

        expect(report).toEqual(
            expect.objectContaining({
                recording: true,
                people: 2,
                optedOut: 0,
                paths: [{ from: '/play', page: '/play/history', count: 1 }],
                actions: expect.arrayContaining([
                    { name: 'game_added', events: 1, people: 1, views: [{ view: '/games/:gameId', count: 1 }] },
                ]),
                funnels: expect.arrayContaining([
                    expect.objectContaining({
                        name: 'Getting started',
                        steps: expect.arrayContaining([{ label: 'Created an account', people: 0 }]),
                    }),
                ]),
            }),
        )
        expect(report.pages).toEqual(expect.arrayContaining([{ page: '/play/history', views: 1, people: 1 }]))
    })

    it('rolls finished days into anonymous counts and deletes raw events after 30 days, only for Vercel Cron', async () => {
        sql(`
            INSERT INTO UsageEvent (name, pseudonym, view, createdAt) VALUES
                ('page_viewed', 'p1', '/play', datetime('now', '-40 days')),
                ('page_viewed', 'p2', '/play', datetime('now', '-40 days')),
                ('review_saved', 'p1', NULL, datetime('now', '-2 days'));
        `)

        await http().get('/internal/daily-maintenance').expect(401)
        await http().get('/internal/daily-maintenance').set('Authorization', 'Bearer wrong').expect(401)
        await http().get('/internal/daily-maintenance').set('Authorization', 'Bearer test-cron-secret').expect(200)

        expect(sql('SELECT name, view, events, people FROM UsageDaily ORDER BY day, name;')).toBe(
            'page_viewed|/play|2|2\nreview_saved||1|1',
        )
        expect(sql("SELECT COUNT(*) FROM UsageEvent WHERE createdAt < datetime('now', '-30 days');")).toBe('0')
        // A second run counts nothing twice.
        await http().get('/internal/daily-maintenance').set('Authorization', 'Bearer test-cron-secret').expect(200)
        expect(sql('SELECT SUM(events) FROM UsageDaily;')).toBe('3')
        expect(sql('PRAGMA table_info(UsageDaily);')).not.toContain('pseudonym')
    })

    it("deletes an account's events with the account, and keeps the anonymous counts", async () => {
        expect(Number(sql(`SELECT COUNT(*) FROM UsageEvent WHERE pseudonym = '${pseudonym(2)}';`))).toBeGreaterThan(0)

        await http().delete('/auth/account').set(as('user_bea')).expect(204)

        expect(sql(`SELECT COUNT(*) FROM UsageEvent WHERE pseudonym = '${pseudonym(2)}';`)).toBe('0')
        expect(sql('SELECT COUNT(*) FROM UsageNotice WHERE accountId = 2;')).toBe('0')
        expect(sql('SELECT SUM(events) FROM UsageDaily;')).toBe('3')
    })

    it('never records an event for a deleted account, even one that lands after the deletion (#299)', async () => {
        const usage = app.get(UsageService)
        const deesEvents = () => sql(`SELECT COUNT(*) FROM UsageEvent WHERE pseudonym = '${pseudonym(4)}';`)

        sql(`INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted)
             VALUES (4, 'dee@example.test', 'deeplays', ${avatar}, 'Dee', 'user_dee', 0, 0);`)
        await usage.record(4, 'game_added')
        expect(deesEvents()).toBe('1')

        // Account deletion marks the account deleted, then forgets its events (account-deletion.service.ts). On
        // Vercel the insert runs after the response, so one can reach the database after both.
        sql('UPDATE Account SET isDeleted = 1 WHERE id = 4;')
        await usage.forgetAccount(4)
        await usage.record(4, 'review_saved')

        expect(deesEvents()).toBe('0')
    })

    describe('after the response (#299)', () => {
        let held: { opened: Promise<void>; open: () => void }
        let kept: Array<Promise<unknown>>
        let insert: MockInstance

        /** Cai's events with that name. */
        const caiCounted = (name: string) =>
            Number(sql(`SELECT COUNT(*) FROM UsageEvent WHERE pseudonym = '${pseudonym(3)}' AND name = '${name}';`))

        beforeEach(() => {
            let open!: () => void
            const opened = new Promise<void>(resolve => (open = resolve))

            held = { opened, open }
            kept = []
            // Every usage insert waits until the test lets it go.
            const usage = app.get(DatabaseService).usage
            const original = usage.record.bind(usage)

            insert = vi.spyOn(usage, 'record').mockImplementation(async (...args) => {
                await held.opened
                return original(...args)
            })
        })

        afterEach(async () => {
            held.open()
            await Promise.all(kept)
            insert.mockRestore()
            delete contexts[VERCEL_REQUEST_CONTEXT]
        })

        it('answers a counted request on Vercel without waiting for its event, which still arrives', async () => {
            contexts[VERCEL_REQUEST_CONTEXT] = { get: () => ({ waitUntil: (promise: Promise<unknown>) => kept.push(promise) }) }
            const before = caiCounted('game_added')

            // The insert is held, so a response that waited for it could not arrive.
            await http().post('/collection/users/3/games/1').set(as('user_cai')).expect(201)
            expect(insert).toHaveBeenCalledOnce()
            expect(caiCounted('game_added')).toBe(before)

            held.open()
            await Promise.all(kept)
            expect(caiCounted('game_added')).toBe(before + 1)
        })

        it('waits for the event outside Vercel, as locally and in tests', async () => {
            const before = caiCounted('page_viewed')
            let answered = false
            const viewing = http()
                .post('/navigation')
                .set(as('user_cai'))
                .send({ page: '/play' })
                .then(response => {
                    answered = true
                    return response
                })

            // The insert is held; a response that did not wait for it would arrive now.
            await vi.waitFor(() => expect(insert).toHaveBeenCalledOnce())
            await new Promise(resolve => setTimeout(resolve, 200))
            expect(answered).toBe(false)

            held.open()
            expect((await viewing).status).toBe(204)
            expect(kept).toEqual([])
            expect(caiCounted('page_viewed')).toBe(before + 1)
        })
    })
})
