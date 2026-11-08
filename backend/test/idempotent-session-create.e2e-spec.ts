import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ApiErrorFilter } from './../src/common/http/api-error.filter.js'
import { ProviderTimeoutError } from './../src/common/http/provider-timeout.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { DatabaseService } from './../src/modules/common/database/database.service.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'idempotent-session-create.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const cronSecret = 'test-cron-secret'

const auth = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
const ana = auth('user_ana')
const bruno = auth('user_bruno')

/**
 * Creating a game night with an `Idempotency-Key` (#246): a repeat, even a simultaneous one, returns the first
 * night and creates nothing, tells nobody again, and is not counted again.
 */
describe('creating a game night with an Idempotency-Key (e2e)', () => {
    let app: INestApplication
    let database: Client
    let groupId: number
    let keyNumber = 0

    /** A fresh UUID for each submission. */
    const newKey = () => `00000000-0000-4000-8000-${String(++keyNumber).padStart(12, '0')}`
    const count = async (sql: string, args: Array<number | string> = []) => Number((await database.execute({ sql, args })).rows[0]?.[0])
    const nights = () => count('SELECT COUNT(*) FROM Meet WHERE groupId = ?', [groupId])
    const post = (path: string, body: object, key?: string, who = ana) => {
        const call = request(app.getHttpServer()).post(path).set(who)

        return (key ? call.set('Idempotency-Key', key) : call).send(body)
    }
    const recorded = () => ({
        groupId,
        sessionDate: '2026-10-03T12:00:00.000Z',
        timezone: 'Europe/Madrid',
        attendeeIds: [1, 2],
        games: [{ gameId: 10, participantIds: [1, 2] }],
    })
    const planned = (sessionDate = '2026-12-05T19:00:00.000Z') => ({ groupId, sessionDate, timezone: 'Europe/Madrid' })

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
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId)
                VALUES
                    (1, 'ana@example.test', 'anita', ${avatar}, 'Ana Ruiz', 'user_ana'),
                    (2, 'bruno@example.test', 'bruno', ${avatar}, 'Bruno', 'user_bruno');
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (10, '', 60, 2, 4);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (10, 'en', 'Catan', 'catan');
                INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary)
                SELECT gameId, languageCode, title, normalizedTitle, 1 FROM GameTranslation;
                INSERT INTO OwnedGame (accountId, gameId) VALUES (1, 10);
            `,
            encoding: 'utf8',
        })

        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = ''
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'
        process.env.USAGE_PSEUDONYM_SECRET = 'test-usage-secret'
        process.env.CRON_SECRET = cronSecret

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(ClerkTokenVerifier)
            .useValue(new FakeClerkTokenVerifier())
            .compile()

        app = moduleFixture.createNestApplication()
        // As in main.ts: errors carry their documented status and code.
        app.useGlobalFilters(new ApiErrorFilter())
        await app.init()
        database = createClient({ url: `file:${testDatabasePath}` })

        const created = await request(app.getHttpServer()).post('/dashboard/users/1/groups/create/tuesday_club').set(ana).expect(201)

        groupId = Number(created.body.groupId)
        await database.execute({ sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (2, ?)', args: [groupId] })
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        delete process.env.USAGE_PSEUDONYM_SECRET
        delete process.env.CRON_SECRET
        removeTestDatabase(testDatabasePath)
    })

    it('records a played night once when the same request is sent twice with the same key, and both get its id', async () => {
        const key = newKey()
        const before = await nights()
        const activityBefore = await count("SELECT COUNT(*) FROM GroupActivity WHERE groupId = ? AND type = 'session_recorded'", [groupId])
        const usageBefore = await count("SELECT COUNT(*) FROM UsageEvent WHERE name = 'session_recorded'")

        const first = await post('/sessions', recorded(), key).expect(201)
        const again = await post('/sessions', recorded(), key).expect(201)

        expect(first.body).toEqual({ sessionId: expect.any(Number), status: 'completed' })
        expect(again.body).toEqual(first.body)
        expect(await nights()).toBe(before + 1)
        expect(await count('SELECT COUNT(*) FROM MeetAccountGame WHERE meetId = ?', [first.body.sessionId])).toBe(2)
        expect(await count("SELECT COUNT(*) FROM GroupActivity WHERE groupId = ? AND type = 'session_recorded'", [groupId])).toBe(
            activityBefore + 1,
        )
        expect(await count("SELECT COUNT(*) FROM UsageEvent WHERE name = 'session_recorded'")).toBe(usageBefore + 1)
    })

    it('plans a night once and tells the invited people once when it is sent twice with the same key', async () => {
        const key = newKey()
        const before = await nights()

        const first = await post('/sessions/scheduled', planned(), key).expect(201)
        const notificationsAfterFirst = await count('SELECT COUNT(*) FROM Notification WHERE accountId = 2')
        const again = await post('/sessions/scheduled', planned(), key).expect(201)

        expect(first.body).toEqual({ sessionId: expect.any(Number), status: 'scheduled' })
        expect(again.body).toEqual(first.body)
        expect(await nights()).toBe(before + 1)
        expect(notificationsAfterFirst).toBeGreaterThan(0)
        expect(await count('SELECT COUNT(*) FROM Notification WHERE accountId = 2')).toBe(notificationsAfterFirst)
        expect(await count("SELECT COUNT(*) FROM UsageEvent WHERE name = 'session_planned'")).toBe(1)
    })

    it('starts a live night once with the same key', async () => {
        const key = newKey()
        const before = await nights()

        const first = await post('/sessions/live', planned(), key).expect(201)
        const again = await post('/sessions/live', planned(), key).expect(201)

        expect(first.body).toEqual({ sessionId: expect.any(Number), status: 'active' })
        expect(again.body).toEqual(first.body)
        expect(await nights()).toBe(before + 1)
    })

    it('creates one night when two requests with the same key arrive at the same time', async () => {
        const key = newKey()
        const before = await nights()

        const answers = await Promise.all([post('/sessions/scheduled', planned(), key), post('/sessions/scheduled', planned(), key)])

        expect(answers.map(answer => answer.status)).toEqual([201, 201])
        expect(answers[1]?.body).toEqual(answers[0]?.body)
        expect(await nights()).toBe(before + 1)
        expect(await count('SELECT COUNT(*) FROM IdempotencyKey WHERE idempotencyKey = ?', [key])).toBe(1)
    })

    it('when the check misses a key another request has just saved, the database refuses the second night and the first is returned', async () => {
        const key = newKey()
        const first = await post('/sessions/scheduled', planned(), key).expect(201)
        const before = await nights()
        const notificationsBefore = await count('SELECT COUNT(*) FROM Notification WHERE accountId = 2')
        const lookup = vi.spyOn(app.get(DatabaseService).idempotency, 'find')

        // The second request's check runs before the first one committed: it sees no key and goes on to create.
        lookup.mockResolvedValueOnce(null)
        const second = await post('/sessions/scheduled', planned(), key).expect(201)

        expect(second.body).toEqual(first.body)
        expect(lookup).toHaveBeenCalledTimes(2) // the missed check, then the one after the key refused the insert
        expect(await nights()).toBe(before)
        expect(await count('SELECT COUNT(*) FROM Notification WHERE accountId = 2')).toBe(notificationsBefore)
        lookup.mockRestore()
    })

    it('when the night was saved but the database timed out, the retry returns it, and tells people and counts it once', async () => {
        const key = newKey()
        const before = await nights()
        const notificationsBefore = await count('SELECT COUNT(*) FROM Notification WHERE accountId = 2')
        const usageBefore = await count("SELECT COUNT(*) FROM UsageEvent WHERE name = 'session_planned'")
        const sessions = app.get(DatabaseService).sessions
        const save = sessions.createScheduledSession.bind(sessions)
        const write = vi.spyOn(sessions, 'createScheduledSession')

        // Turso committed, then the answer did not arrive in time.
        write.mockImplementationOnce(async input => {
            await save(input)
            throw new ProviderTimeoutError('database')
        })
        const lost = await post('/sessions/scheduled', planned('2026-12-12T19:00:00.000Z'), key).expect(503)

        expect(lost.body).toMatchObject({ code: 'DATABASE_TIMEOUT' })
        expect(await nights()).toBe(before + 1)
        expect(await count('SELECT COUNT(*) FROM Notification WHERE accountId = 2')).toBe(notificationsBefore)

        const retry = await post('/sessions/scheduled', planned('2026-12-12T19:00:00.000Z'), key).expect(201)
        const again = await post('/sessions/scheduled', planned('2026-12-12T19:00:00.000Z'), key).expect(201)

        expect(write).toHaveBeenCalledOnce()
        expect(again.body).toEqual(retry.body)
        expect(await nights()).toBe(before + 1)
        expect(await count('SELECT COUNT(*) FROM Notification WHERE accountId = 2')).toBe(notificationsBefore + 1)
        expect(await count("SELECT COUNT(*) FROM UsageEvent WHERE name = 'session_planned'")).toBe(usageBefore + 1)
        write.mockRestore()
    })

    it('answers a repeat even when the night could no longer be created as it was, such as after leaving the group', async () => {
        const key = newKey()
        const first = await post('/sessions/scheduled', planned(), key).expect(201)
        const membership = vi.spyOn(app.get(DatabaseService).groups, 'getGroupMemberIds').mockResolvedValue([])

        const again = await post('/sessions/scheduled', planned(), key).expect(201)

        expect(again.body).toEqual(first.body)
        expect(membership).not.toHaveBeenCalled()
        membership.mockRestore()
    })

    it('refuses the same key for a different request, and for another kind of creation, creating nothing', async () => {
        const key = newKey()

        await post('/sessions/scheduled', planned(), key).expect(201)
        const before = await nights()

        const changed = await post('/sessions/scheduled', planned('2026-12-12T19:00:00.000Z'), key).expect(422)
        const otherRoute = await post('/sessions/live', planned(), key).expect(422)

        expect(changed.body).toMatchObject({ statusCode: 422, code: 'IDEMPOTENCY_KEY_REUSED' })
        expect(otherRoute.body).toMatchObject({ statusCode: 422, code: 'IDEMPOTENCY_KEY_REUSED' })
        expect(await nights()).toBe(before)
    })

    it('refuses a key that is not a UUID, before creating anything', async () => {
        const before = await nights()
        const answer = await post('/sessions/scheduled', planned(), 'not-a-uuid').expect(400)

        expect(answer.body).toMatchObject({ statusCode: 400, code: 'IDEMPOTENCY_KEY_INVALID' })
        expect(await nights()).toBe(before)
    })

    it('keeps each account’s keys apart, and creates as before without a key', async () => {
        const key = newKey()
        const before = await nights()

        const byAna = await post('/sessions/scheduled', planned(), key, ana).expect(201)
        const byBruno = await post('/sessions/scheduled', planned(), key, bruno).expect(201)

        await post('/sessions/scheduled', planned()).expect(201)
        await post('/sessions/scheduled', planned()).expect(201)

        expect(byBruno.body.sessionId).not.toBe(byAna.body.sessionId)
        expect(await nights()).toBe(before + 4)
    })

    it('forgets a key after 24 hours, and the daily job deletes old keys', async () => {
        const key = newKey()
        const first = await post('/sessions/scheduled', planned(), key).expect(201)

        await database.execute({
            sql: "UPDATE IdempotencyKey SET createdAt = datetime('now', '-25 hours') WHERE idempotencyKey = ?",
            args: [key],
        })
        const later = await post('/sessions/scheduled', planned(), key).expect(201)

        expect(later.body.sessionId).not.toBe(first.body.sessionId)
        expect(await count('SELECT resourceId FROM IdempotencyKey WHERE idempotencyKey = ?', [key])).toBe(later.body.sessionId)

        await database.execute({
            sql: "UPDATE IdempotencyKey SET createdAt = datetime('now', '-25 hours') WHERE idempotencyKey = ?",
            args: [key],
        })
        const kept = await count('SELECT COUNT(*) FROM IdempotencyKey')
        const job = await request(app.getHttpServer())
            .get('/internal/daily-maintenance')
            .set('Authorization', `Bearer ${cronSecret}`)
            .expect(200)

        expect(job.body.expiredIdempotencyKeys).toBe(1)
        expect(await count('SELECT COUNT(*) FROM IdempotencyKey')).toBe(kept - 1)
    })
})
