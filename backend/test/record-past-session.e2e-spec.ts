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
const testDatabasePath = resolve(__dirname, 'record-past-session.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

describe('recording a past session with group people (e2e)', () => {
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
                PRAGMA foreign_keys = ON;
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId)
                VALUES
                    (1, 'organizer@example.test', 'organizer', ${avatar}, 'Organizer', 'user_organizer'),
                    (2, 'member@example.test', 'member', ${avatar}, 'Member', 'user_member');
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers)
                VALUES (10, 'https://example.test/game-10.png', 60, 2, 4), (11, 'https://example.test/game-11.png', 30, 2, 5);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle)
                VALUES (10, 'en', 'Game Ten', 'game ten'), (11, 'en', 'Game Eleven', 'game eleven');
                INSERT INTO OwnedGame (accountId, gameId) VALUES (2, 10), (2, 11);
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
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    const withAuth = { Authorization: `Bearer ${sessionFor('user_organizer')}` }

    // A group with the organizer and a member, both linked group people, like accounts backfilled by migration 0010.
    async function createGroupWithPeople(): Promise<{ groupId: number; personIds: Array<number> }> {
        const created = await request(app.getHttpServer())
            .post('/dashboard/users/1/groups/create/group_example')
            .set(withAuth)
            .send({})
            .expect(201)
        const groupId = Number(created.body.groupId)

        await database.batch([
            { sql: 'INSERT INTO GroupMembership (accountId, groupId) VALUES (2, ?)', args: [groupId] },
            {
                sql: "INSERT INTO GroupPerson (groupId, accountId, kind, status, displayName, createdByAccountId) VALUES (?, 2, 'linked', 'active', 'Member', 1)",
                args: [groupId],
            },
        ])

        const people = await request(app.getHttpServer()).get(`/groups/${groupId}/people`).set(withAuth).expect(200)
        const personIds = (people.body.people as Array<{ person: { id: number } }>).map(entry => entry.person.id).sort((a, b) => a - b)

        expect(personIds).toHaveLength(2)

        return { groupId, personIds }
    }

    it('saves a completed session the way the Record a past session wizard sends it', async () => {
        const { groupId, personIds } = await createGroupWithPeople()

        const response = await request(app.getHttpServer())
            .post('/sessions')
            .set(withAuth)
            .send({
                groupId,
                sessionDate: '2026-10-02T10:00:00.000Z',
                timezone: 'Europe/Madrid',
                notes: 'Recorded after the game night.',
                groupPersonIds: personIds,
                games: [{ gameId: 10, participantPersonIds: personIds }],
            })

        // It answered 500 when the session helpers called group queries with the wrong `this`.
        expect({ status: response.status, body: response.body }).toEqual({
            status: 201,
            body: { sessionId: expect.any(Number), status: 'completed' },
        })

        const sessionId = Number(response.body.sessionId)
        const attendees = await database.execute({
            sql: 'SELECT groupPersonId FROM MeetPersonAttendee WHERE meetId = ? ORDER BY groupPersonId',
            args: [sessionId],
        })
        const players = await database.execute({
            sql: 'SELECT groupPersonId FROM MeetPersonGame WHERE meetId = ? AND gameId = 10 ORDER BY groupPersonId',
            args: [sessionId],
        })

        expect(attendees.rows.map(row => Number(row.groupPersonId))).toEqual(personIds)
        expect(players.rows.map(row => Number(row.groupPersonId))).toEqual(personIds)

        const details = await request(app.getHttpServer()).get(`/sessions/${sessionId}`).set(withAuth).expect(200)

        expect(details.body.playedGamePersonParticipants).toEqual([{ gameId: 10, participantIds: personIds }])
    })

    it('schedules a future session with group people', async () => {
        const { groupId, personIds } = await createGroupWithPeople()

        const response = await request(app.getHttpServer())
            .post('/sessions/scheduled')
            .set(withAuth)
            .send({
                groupId,
                sessionDate: '2026-10-20T18:00:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: personIds,
                plannedGameIds: [10],
            })

        expect({ status: response.status, body: response.body }).toEqual({
            status: 201,
            body: { sessionId: expect.any(Number), status: 'scheduled' },
        })
    })

    it('records who won a played game, reads it back, and drops results of someone taken off the game', async () => {
        const { groupId, personIds } = await createGroupWithPeople()
        const [organizerPersonId, memberPersonId] = personIds

        const scheduled = await request(app.getHttpServer())
            .post('/sessions/scheduled')
            .set(withAuth)
            .send({ groupId, sessionDate: '2026-10-20T18:00:00.000Z', timezone: 'Europe/Madrid', groupPersonIds: personIds })
            .expect(201)
        const sessionId = Number(scheduled.body.sessionId)

        await request(app.getHttpServer()).patch(`/sessions/${sessionId}/status`).set(withAuth).send({ status: 'active' }).expect(200)
        await request(app.getHttpServer())
            .patch(`/sessions/${sessionId}/played-games`)
            .set(withAuth)
            .send({ playedGameIds: [10], games: [{ gameId: 10, participantPersonIds: personIds }] })
            .expect(200)

        await request(app.getHttpServer())
            .put(`/sessions/${sessionId}/games/10/results`)
            .set(withAuth)
            .send({
                results: [
                    { groupPersonId: memberPersonId, isWinner: true, score: 42 },
                    { groupPersonId: organizerPersonId, isWinner: false, score: 30 },
                ],
            })
            .expect(200)

        const details = await request(app.getHttpServer()).get(`/sessions/${sessionId}`).set(withAuth).expect(200)

        expect(details.body.gameResults).toEqual([
            {
                gameId: 10,
                results: expect.arrayContaining([
                    { accountId: null, groupPersonId: memberPersonId, isWinner: true, score: 42 },
                    { accountId: null, groupPersonId: organizerPersonId, isWinner: false, score: 30 },
                ]),
            },
        ])

        // Someone who did not play the game cannot win it.
        await request(app.getHttpServer())
            .put(`/sessions/${sessionId}/games/11/results`)
            .set(withAuth)
            .send({ results: [{ groupPersonId: memberPersonId, isWinner: true }] })
            .expect(400)

        await request(app.getHttpServer())
            .patch(`/sessions/${sessionId}/played-games`)
            .set(withAuth)
            .send({ playedGameIds: [10], games: [{ gameId: 10, participantPersonIds: [organizerPersonId] }] })
            .expect(200)

        const afterChange = await request(app.getHttpServer()).get(`/sessions/${sessionId}`).set(withAuth).expect(200)

        expect(afterChange.body.gameResults).toEqual([
            { gameId: 10, results: [{ accountId: null, groupPersonId: organizerPersonId, isWinner: false, score: 30 }] },
        ])
    })

    it('keeps the rest of the shortlist planned while games are marked, and skips it when the night finishes', async () => {
        const { groupId, personIds } = await createGroupWithPeople()

        const scheduled = await request(app.getHttpServer())
            .post('/sessions/scheduled')
            .set(withAuth)
            .send({
                groupId,
                sessionDate: '2026-10-20T18:00:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: personIds,
                plannedGameIds: [10, 11],
            })
            .expect(201)
        const sessionId = Number(scheduled.body.sessionId)

        // Started before its date (20 October), so the night is dated now (#94).
        const started = await request(app.getHttpServer())
            .patch(`/sessions/${sessionId}/status`)
            .set(withAuth)
            .send({ status: 'active' })
            .expect(200)

        expect(Date.parse(started.body.sessionDate)).toBeLessThanOrEqual(Date.now())
        const marked = await request(app.getHttpServer())
            .patch(`/sessions/${sessionId}/played-games`)
            .set(withAuth)
            .send({ playedGameIds: [10], games: [{ gameId: 10, participantPersonIds: personIds }] })
            .expect(200)

        expect(marked.body.skippedGameIds).toEqual([])

        const live = await request(app.getHttpServer()).get(`/sessions/${sessionId}`).set(withAuth).expect(200)

        expect({ planned: live.body.plannedGames, skipped: live.body.skippedGames }).toEqual({ planned: [11], skipped: [] })

        // Unmarking a played game is what skips it during the night.
        const unmarked = await request(app.getHttpServer())
            .patch(`/sessions/${sessionId}/played-games`)
            .set(withAuth)
            .send({ playedGameIds: [], games: [] })
            .expect(200)

        expect(unmarked.body.skippedGameIds).toEqual([10])

        // Nothing is marked as played now, so finishing needs the organizer's confirmation (#94).
        await request(app.getHttpServer()).patch(`/sessions/${sessionId}/status`).set(withAuth).send({ status: 'completed' }).expect(400)
        await request(app.getHttpServer())
            .patch(`/sessions/${sessionId}/status`)
            .set(withAuth)
            .send({ status: 'completed', noGamesPlayed: true })
            .expect(200)
        const finished = await request(app.getHttpServer()).get(`/sessions/${sessionId}`).set(withAuth).expect(200)

        expect([...finished.body.skippedGames].sort()).toEqual([10, 11])
    })
})
