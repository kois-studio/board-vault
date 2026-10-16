import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkIdentityService } from './../src/modules/common/auth/clerk-identity.service.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { INBOX_LIMIT } from './../src/modules/common/database/queries/notifications.queries.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'notifications.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const NAMES: Record<number, string> = { 2: 'olga', 3: 'pau', 4: 'rita', 5: 'tess', 6: 'uma' }

type Notification = { id: number; type: string; message: string; data: Record<string, unknown>; createdAt: string }

/**
 * The inbox through the API: dates a browser reads right, newest first and capped, nobody writing
 * their own, "joined" only once, and nothing left that leads to a group someone left or that is
 * gone, or that still names a deleted account. Olga owns Fridays (10) and Solo (20).
 */
describe('notifications (e2e)', () => {
    let app: INestApplication
    let database: Client

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
                    (2, 'olga@example.test', 'olgaplays', ${avatar}, 'Olga', 'user_olga', 0, 0),
                    (3, 'pau@example.test', 'pauplays', ${avatar}, 'Paula', 'user_pau', 0, 0),
                    (4, 'rita@example.test', 'ritaplays', ${avatar}, 'Rita', 'user_rita', 0, 0),
                    (5, 'tess@example.test', 'tessplays', ${avatar}, 'Tess', 'user_tess', 0, 0),
                    (6, 'uma@example.test', 'umaplays', ${avatar}, 'Uma', 'user_uma', 0, 0);
                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 2), (20, 'Solo', 2);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (2, 10), (3, 10), (4, 10), (2, 20);
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
        const clerk = app.get(ClerkIdentityService)

        clerk.deleteClerkUser = async () => undefined
        clerk.revokeInvitationsFrom = async () => ({ revoked: 0, failed: 0 })
        database = createClient({ url: `file:${testDatabasePath}` })
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    const server = () => request(app.getHttpServer())
    const as = (id: number) => ({ Authorization: `Bearer ${sessionFor(`user_${NAMES[id]}`)}` })
    const inbox = async (id: number) =>
        (await server().get(`/profile/users/${id}/notifications`).set(as(id)).expect(200)).body as Array<Notification>
    const insert = (accountId: number, type: string, data: string, createdAt = '2026-01-01 10:00:00') =>
        database.execute({
            sql: 'INSERT INTO Notification (accountId, type, message, data, createdAt) VALUES (?, ?, ?, ?, ?)',
            args: [accountId, type, `${type} for ${accountId}`, data, createdAt],
        })

    it('answers each notification with a date browsers read as UTC', async () => {
        const before = Date.now()

        await server()
            .post('/sessions/scheduled')
            .set(as(3))
            .send({ groupId: 10, sessionDate: '2026-12-18T19:00:00.000Z', timezone: 'Europe/Madrid', attendeeIds: [3, 4] })
            .expect(201)

        const [planned] = await inbox(4)

        expect(planned?.type).toBe('meeting_scheduled')
        expect(planned?.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/)
        // SQLite stores whole seconds.
        expect(Date.parse(planned?.createdAt ?? '')).toBeGreaterThanOrEqual(Math.floor(before / 1000) * 1000)
        expect(Date.parse(planned?.createdAt ?? '')).toBeLessThanOrEqual(Date.now())
    })

    it('has no way for someone to write their own notifications', async () => {
        await server()
            .post('/notifications')
            .set(as(4))
            .send({ type: 'game_proposal_approved', message: 'Approved!', data: {} })
            .expect(404)
    })

    it('answers the newest first, written-together rows in order, and at most the latest hundred', async () => {
        for (let index = 0; index < INBOX_LIMIT + 5; index++) await insert(6, 'user_joined_group', '{"account":2,"group":10}')
        await insert(6, 'user_joined_group', '{"account":2,"group":10}', '2026-06-01 10:00:00')
        await insert(6, 'user_joined_group', '{"account":3,"group":10}', '2026-06-01 10:00:00')

        const notifications = await inbox(6)

        expect(notifications).toHaveLength(INBOX_LIMIT)
        expect(notifications.slice(0, 2).map(notification => notification.data['account'])).toEqual([3, 2])
        expect(notifications[2]?.createdAt).toBe('2026-01-01T10:00:00.000Z')
    })

    it('tells the group once when someone joins, not again when they accept a second invitation', async () => {
        const invitation = await server()
            .post('/invitations/byUsername')
            .set(as(2))
            .send({ groupId: 10, username: 'tessplays' })
            .expect(201)
        const firstId = Number((await server().get('/profile/users/5/invitations').set(as(5)).expect(200)).body[0]?.id)

        expect(invitation.status).toBe(201)
        await server().post(`/profile/users/5/invitations/${firstId}/accept`).set(as(5)).expect(201)

        const joined = async () =>
            (
                await database.execute(
                    "SELECT COUNT(*) AS n FROM Notification WHERE type = 'user_joined_group' AND json_extract(data, '$.account') = 5",
                )
            ).rows[0]?.n

        expect(Number(await joined())).toBe(3)

        // A second invitation to someone already in the group (sent before they accepted the first, say).
        const again = await database.execute({
            sql: "INSERT INTO Invitation (groupId, fromAccountId, toAccountId, expiresAt) VALUES (10, 3, 5, datetime('now', '+7 days')) RETURNING id",
            args: [],
        })

        await server()
            .post(`/profile/users/5/invitations/${Number(again.rows[0]?.id)}/accept`)
            .set(as(5))
            .expect(201)

        expect(Number(await joined())).toBe(3)
    })

    it('drops the notifications about a group someone leaves, and keeps the rest', async () => {
        await insert(4, 'game_proposal_rejected', '{"gameTitle":"Azul","proposalId":4,"reviewNotes":"No"}')
        await insert(4, 'user_joined_group', 'not json')
        expect((await inbox(4)).map(notification => notification.type)).toEqual(
            expect.arrayContaining(['meeting_scheduled', 'user_joined_group', 'game_proposal_rejected']),
        )

        await server().delete('/dashboard/users/4/groups/10/members').set(as(4)).expect(200)

        expect((await inbox(4)).map(notification => notification.type)).toEqual(['game_proposal_rejected'])
        // Unreadable data never matches a group, and never fails the leaving.
        const broken = await database.execute("SELECT COUNT(*) AS n FROM Notification WHERE accountId = 4 AND data = 'not json'")

        expect(Number(broken.rows[0]?.n)).toBe(1)
    })

    it('drops everyone’s notifications about a deleted group', async () => {
        await insert(3, 'user_joined_group', '{"account":2,"group":20}')
        await insert(5, 'user_joined_group', '{"account":2,"group":20}')

        await server().delete('/dashboard/users/2/groups/20').set(as(2)).expect(200)

        const left = await database.execute(
            "SELECT COUNT(*) AS n FROM Notification WHERE json_valid(data) AND json_extract(data, '$.group') = 20",
        )

        expect(Number(left.rows[0]?.n)).toBe(0)
    })

    it('stops naming someone who deleted their account in what others were told', async () => {
        await server()
            .post('/sessions/scheduled')
            .set(as(3))
            .send({ groupId: 10, sessionDate: '2026-12-20T19:00:00.000Z', timezone: 'Europe/Madrid', attendeeIds: [3, 5] })
            .expect(201)
        expect((await inbox(5)).map(notification => notification.message)).toContain(
            'Paula planned a game night in Fridays for Sun 20 Dec, 20:00. Can you make it?',
        )

        await server().delete('/auth/account').set(as(3)).expect(204)

        const messages = (await inbox(5)).map(notification => notification.message)

        expect(messages).toContain('Deleted account planned a game night in Fridays for Sun 20 Dec, 20:00. Can you make it?')
        expect(messages.join(' ')).not.toContain('Paula')
        // Olga's own notifications about Tess are untouched.
        expect((await inbox(2)).map(notification => notification.message)).toContain('Tess joined Fridays.')
    })
})
