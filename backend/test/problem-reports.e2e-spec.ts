import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication, ValidationPipe } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { PROBLEMS_PER_DAY } from './../src/modules/common/database/queries/problem.queries.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'problem-reports.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const firefox = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:133.0) Gecko/20100101 Firefox/133.0'

// ADR-0028: problem reports of our own, scrubbed, one row per problem per day, nobody named.
describe('problem reports (e2e)', () => {
    let app: INestApplication

    const sql = (input: string) => execFileSync('sqlite3', [testDatabasePath], { input, encoding: 'utf8' }).replace(/\r\n/g, '\n').trim()

    beforeAll(async () => {
        rmSync(testDatabasePath, { force: true })
        sql(readFileSync(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8'))
        execFileSync(process.execPath, [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
            cwd: repositoryRoot,
            env: { ...process.env, TURSO_DATABASE_URL: `file:${testDatabasePath}`, TURSO_AUTH_TOKEN: '', MIGRATION_BASELINE: '0005' },
            encoding: 'utf8',
        })
        sql(`
            INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                (1, 'ada@example.test', 'adaplays', ${avatar}, 'Ada', 'user_ada', 1, 0),
                (2, 'bea@example.test', 'beaplays', ${avatar}, 'Bea', 'user_bea', 0, 0);
        `)

        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = ''
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'
        process.env.CRON_SECRET = 'test-cron-secret'

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(ClerkTokenVerifier)
            .useValue(new FakeClerkTokenVerifier())
            .compile()

        app = moduleFixture.createNestApplication()
        // As in main.ts: every DTO boundary strict.
        app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
        await app.init()
    })

    afterAll(async () => {
        delete process.env.CRON_SECRET
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    beforeEach(() => sql('DELETE FROM ProblemReport;'))

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
    const http = () => request(app.getHttpServer())
    const report = (body: Record<string, unknown>) => http().post('/problems').set('User-Agent', firefox).send(body)

    it('keeps a problem without sign-in, scrubbed, with the browser as a family only', async () => {
        await report({
            kind: 'error',
            name: 'TypeError',
            message: 'Failed for ada@example.test at https://board-vault.com/groups/12?invite=secret, account 1234567',
            stack: 'TypeError: x\n    at f (https://board-vault.com/en/chunk-AB12.js:1:23456)',
            view: '/groups/:groupId',
            release: 'a1b2c3d',
            locale: 'es',
        }).expect(204)

        expect(
            sql("SELECT source, kind, name, message, view, release, locale, browser, occurrences, day = date('now') FROM ProblemReport;"),
        ).toBe(
            'app|error|TypeError|Failed for [email] at https://board-vault.com/groups/12, account #|/groups/:groupId|a1b2c3d|es|Firefox 133 · Windows|1|1',
        )
        // Stack line and column numbers stay: they are what a stack is for.
        expect(sql('SELECT stack FROM ProblemReport;')).toContain('chunk-AB12.js:1:23456')
    })

    it('counts the same problem on the same day in one row, numbers aside, with the latest sample', async () => {
        await report({ kind: 'error', name: 'Error', message: 'Expected 12 items', view: '/play', release: 'old' }).expect(204)
        await report({ kind: 'error', name: 'Error', message: 'Expected 13 items', view: '/play', release: 'new' }).expect(204)
        await report({ kind: 'error', name: 'Error', message: 'Expected 13 items', view: '/collection' }).expect(204)

        expect(sql('SELECT view, occurrences, message, release FROM ProblemReport ORDER BY view;')).toBe(
            '/collection|1|Expected 13 items|\n/play|2|Expected 13 items|new',
        )
    })

    it('keeps a failed request by its route template, never its ids', async () => {
        await report({
            kind: 'request',
            name: 'HttpErrorResponse',
            message: 'Http failure response: 503',
            view: '/groups/:groupId',
            method: 'get',
            path: '/dashboard/users/2/groups/10/shelf?x=1',
            status: 503,
            requestId: '6f1c2b8e-3d4a-4b5c-9e7f-0a1b2c3d4e5f',
        }).expect(204)

        expect(sql('SELECT kind, endpoint, status, requestId FROM ProblemReport;')).toBe(
            'request|GET /dashboard/users/:id/groups/:id/shelf|503|6f1c2b8e-3d4a-4b5c-9e7f-0a1b2c3d4e5f',
        )
    })

    it('refuses screens that are addresses, unknown kinds and unknown fields', async () => {
        await report({ kind: 'error', name: 'E', message: 'm', view: '/groups/10' }).expect(400)
        await report({ kind: 'exception', name: 'E', message: 'm' }).expect(400)
        await report({ kind: 'error', name: 'E', message: 'm', accountId: 2 }).expect(400)
        expect(sql('SELECT COUNT(*) FROM ProblemReport;')).toBe('0')
    })

    it('adds no new problem past the daily limit, but still counts the ones already seen that day', async () => {
        await report({ kind: 'error', name: 'Error', message: 'seen before' }).expect(204)
        sql(`
            WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i + 1 FROM n WHERE i < ${PROBLEMS_PER_DAY - 1})
            INSERT INTO ProblemReport (day, fingerprint, source, kind, name, message) SELECT date('now'), 'filler-' || i, 'app', 'error', 'E', 'm' FROM n;
        `)

        await report({ kind: 'error', name: 'Error', message: 'brand new' }).expect(204)
        await report({ kind: 'error', name: 'Error', message: 'seen before' }).expect(204)

        expect(sql("SELECT COUNT(*) FROM ProblemReport WHERE message = 'brand new';")).toBe('0')
        expect(sql("SELECT occurrences FROM ProblemReport WHERE message = 'seen before';")).toBe('2')
        const answer = await http().get('/admin/problems').set(as('user_ada')).expect(200)

        expect(answer.body.limitReached).toBe(true)
    })

    it('shows admins each problem once, its days added up, and nobody else', async () => {
        await report({ kind: 'chunk', name: 'Error', message: 'Failed to fetch dynamically imported module', view: '/play' }).expect(204)
        sql(`
            INSERT INTO ProblemReport (day, fingerprint, source, kind, name, message, occurrences, firstSeenAt, lastSeenAt)
            SELECT date('now', '-3 days'), fingerprint, source, kind, name, message, 4, datetime('now', '-3 days'), datetime('now', '-3 days')
            FROM ProblemReport;
        `)

        await http().get('/admin/problems').expect(401)
        await http().get('/admin/problems').set(as('user_bea')).expect(403)
        const answer = await http().get('/admin/problems').set(as('user_ada')).expect(200)

        expect(answer.body.limitReached).toBe(false)
        expect(answer.body.problems).toHaveLength(1)
        expect(answer.body.problems[0]).toMatchObject({
            kind: 'chunk',
            view: '/play',
            occurrences: 5,
            days: 2,
            browser: 'Firefox 133 · Windows',
        })
        expect(answer.body.problems[0].firstSeenAt < answer.body.problems[0].lastSeenAt).toBe(true)
    })

    it('forgets problems older than 30 days in the daily job', async () => {
        sql(`
            INSERT INTO ProblemReport (day, fingerprint, source, kind, name, message) VALUES
                (date('now', '-31 days'), 'old', 'app', 'error', 'E', 'old'),
                (date('now', '-29 days'), 'recent', 'app', 'error', 'E', 'recent');
        `)

        const answer = await http().get('/internal/daily-maintenance').set('Authorization', 'Bearer test-cron-secret').expect(200)

        expect(answer.body.expiredProblems).toBe(1)
        expect(sql('SELECT fingerprint FROM ProblemReport;')).toBe('recent')
    })
})
