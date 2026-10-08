import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { createClient, type Client } from '@libsql/client'
import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'membership-leave.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

const auth = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

/**
 * The older `DELETE /memberships/:accountId/:groupId` leaves a group exactly like the app does
 * (ADR-0018): Bruno leaves, keeps his place in the night already played, and drops out of the
 * next one. Ana, who owns the group, cannot leave it that way.
 */
describe('leaving a group through DELETE /memberships (e2e)', () => {
    let app: INestApplication
    let database: Client
    let groupId: number
    let playedId: number
    let upcomingId: number
    const personOf: Record<'ana' | 'bruno', number> = { ana: 0, bruno: 0 }

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
                INSERT INTO OwnedGame (accountId, gameId) VALUES (1, 10);
            `,
            encoding: 'utf8',
        })

        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = ''
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'
        process.env.BOARD_VAULT_GROUP_PEOPLE_ENABLED = 'true'

        const moduleFixture: TestingModule = await Test.createTestingModule({ imports: [AppModule] })
            .overrideProvider(ClerkTokenVerifier)
            .useValue(new FakeClerkTokenVerifier())
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
        database = createClient({ url: `file:${testDatabasePath}` })

        const created = await request(app.getHttpServer())
            .post('/dashboard/users/1/groups/create/tuesday_club')
            .set(auth('user_ana'))
            .expect(201)

        groupId = Number(created.body.groupId)
        await database.batch([
            { sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (2, ?)', args: [groupId] },
            {
                sql: "INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, createdByAccountId) VALUES (?, 2, 'linked', 'active', 'Bruno', 1)",
                args: [groupId],
            },
        ])
        const people = await database.execute({ sql: 'SELECT id, accountId FROM GroupPerson WHERE groupId = ?', args: [groupId] })

        for (const row of people.rows) personOf[Number(row.accountId) === 1 ? 'ana' : 'bruno'] = Number(row.id)
        const both = [personOf.ana, personOf.bruno]

        const played = await request(app.getHttpServer())
            .post('/sessions')
            .set(auth('user_ana'))
            .send({
                groupId,
                sessionDate: '2026-10-02T19:00:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: both,
                games: [{ gameId: 10, participantPersonIds: both }],
            })
            .expect(201)

        playedId = Number(played.body.sessionId)

        const upcoming = await request(app.getHttpServer())
            .post('/sessions/scheduled')
            .set(auth('user_ana'))
            .send({
                groupId,
                sessionDate: '2026-12-20T19:00:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: both,
                plannedGameIds: [10],
            })
            .expect(201)

        upcomingId = Number(upcoming.body.sessionId)
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    const attendees = async (meetId: number) =>
        (
            await database.execute({
                sql: 'SELECT groupPersonId FROM MeetPersonAttendee WHERE meetId = ? ORDER BY groupPersonId',
                args: [meetId],
            })
        ).rows.map(row => Number(row.groupPersonId))
    const isMember = async (accountId: number) =>
        (await database.execute({ sql: 'SELECT 1 FROM GroupMembership WHERE accountId = ? AND groupId = ?', args: [accountId, groupId] }))
            .rows.length > 0

    it('does not let someone else take a member out', async () => {
        await request(app.getHttpServer()).delete(`/memberships/1/${groupId}`).set(auth('user_bruno')).expect(403)

        expect(await isMember(1)).toBe(true)
    })

    it('does not let the owner leave the group they own', async () => {
        const answer = await request(app.getHttpServer()).delete(`/memberships/1/${groupId}`).set(auth('user_ana')).expect(400)

        expect(answer.body.message).toBe('Owner cannot leave group')
        expect(await isMember(1)).toBe(true)
    })

    it('leaves like the app: the played night keeps Bruno, the upcoming one drops him', async () => {
        await request(app.getHttpServer()).delete(`/memberships/2/${groupId}`).set(auth('user_bruno')).expect(200)

        expect(await isMember(2)).toBe(false)
        expect(await attendees(playedId)).toEqual([personOf.ana, personOf.bruno].sort((a, b) => a - b))
        expect(await attendees(upcomingId)).toEqual([personOf.ana])
    })

    it('answers not found once there is no membership left', async () => {
        await request(app.getHttpServer()).delete(`/memberships/2/${groupId}`).set(auth('user_bruno')).expect(404)
    })
})
