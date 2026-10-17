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
                    (2, 'member@example.test', 'member', ${avatar}, 'Member', 'user_member'),
                    (3, 'outsider@example.test', 'outsider', ${avatar}, 'Outsider', 'user_outsider');
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers)
                VALUES (10, 'https://example.test/game-10.png', 60, 2, 4), (11, 'https://example.test/game-11.png', 30, 2, 5), (12, '', 15, 1, 8);
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

    it('keeps separate plays, scores and winners for an unowned catalogue game, corrects atomically and refuses stale writes', async () => {
        const { groupId, personIds } = await createGroupWithPeople()
        const first = personIds[0] as number
        const second = personIds[1] as number
        const body = {
            groupId,
            sessionDate: '2026-10-03T12:00:00.000Z',
            timezone: 'Europe/Madrid',
            groupPersonIds: personIds,
            games: [
                { gameId: 12, participantPersonIds: [first], results: [{ groupPersonId: first, isWinner: true, score: 12 }] },
                { gameId: 12, participantPersonIds: personIds, results: [{ groupPersonId: second, isWinner: true, score: 25 }] },
            ],
        }
        const created = await request(app.getHttpServer()).post('/sessions').set(withAuth).send(body).expect(201)
        const id = Number(created.body.sessionId)
        const read = await request(app.getHttpServer()).get(`/sessions/${id}/recording`).set(withAuth).expect(200)

        expect(read.body.games).toEqual(body.games)
        const details = await request(app.getHttpServer()).get(`/sessions/${id}`).set(withAuth).expect(200)

        expect(details.body.playedGamePersonParticipants).toEqual([{ gameId: 12, participantIds: personIds }])
        const insights = await request(app.getHttpServer()).get(`/groups/${groupId}/insights`).set(withAuth).expect(200)

        expect(insights.body.standings.find((person: { accountId: number }) => person.accountId === 1)).toMatchObject({
            gamesPlayed: 2,
            wins: 1,
        })
        expect(insights.body.standings.find((person: { accountId: number }) => person.accountId === 2)).toMatchObject({
            gamesPlayed: 1,
            wins: 1,
        })
        const edited = { ...read.body, notes: 'Corrected with both plays preserved.' }

        await request(app.getHttpServer()).put(`/sessions/${id}/recording`).set(withAuth).send(edited).expect(200)
        await request(app.getHttpServer())
            .put(`/sessions/${id}/recording`)
            .set(withAuth)
            .send({ ...edited, notes: 'Stale edit' })
            .expect(409)
        const after = await request(app.getHttpServer()).get(`/sessions/${id}/recording`).set(withAuth).expect(200)

        expect(after.body.notes).toBe(edited.notes)
        expect(after.body.games).toEqual(body.games)
        const activity = await database.execute({
            sql: "SELECT COUNT(*) AS n FROM GroupActivity WHERE meetId = ? AND type = 'session_played_changed'",
            args: [id],
        })

        expect(Number(activity.rows[0]?.n)).toBe(1)
        const before = after.body.revision

        await request(app.getHttpServer())
            .put(`/sessions/${id}/plays/1/results`)
            .set({ Authorization: `Bearer ${sessionFor('user_member')}` })
            .send({ revision: before, results: [{ groupPersonId: second, isWinner: true, score: -4 }] })
            .expect(200)
        await request(app.getHttpServer()).put(`/sessions/${id}/recording`).set(withAuth).send(after.body).expect(409)
        const final = await request(app.getHttpServer()).get(`/sessions/${id}/recording`).set(withAuth).expect(200)

        expect(final.body.games[0]).toEqual(body.games[0])
        expect(final.body.games[1].results[0].score).toBe(-4)
        await request(app.getHttpServer())
            .put(`/sessions/${id}/plays/0/results`)
            .set(withAuth)
            .send({ revision: final.body.revision, results: [{ groupPersonId: second, isWinner: true }] })
            .expect(400)
        expect((await request(app.getHttpServer()).get(`/sessions/${id}/recording`).set(withAuth)).body.games).toEqual(final.body.games)
    })

    it('stores personal pins and ordering without changing another account, and rejects malformed preferences', async () => {
        const { groupId } = await createGroupWithPeople()
        const prefs = { pinnedGroupIds: [groupId, 999999], groupOrder: 'upcoming', dismissedRatingGameIds: [12] }
        const response = await request(app.getHttpServer()).put('/profile/home').set(withAuth).send(prefs).expect(200)

        expect(response.body).toEqual({ ...prefs, pinnedGroupIds: [groupId] })
        expect((await request(app.getHttpServer()).get('/profile/home').set(withAuth)).body).toEqual(response.body)
        const member = await request(app.getHttpServer())
            .get('/profile/home')
            .set({ Authorization: `Bearer ${sessionFor('user_member')}` })
            .expect(200)

        expect(member.body).toEqual({ pinnedGroupIds: [], groupOrder: 'recent', dismissedRatingGameIds: [] })
        await request(app.getHttpServer())
            .put('/profile/home')
            .set(withAuth)
            .send({ ...prefs, accountId: 2 })
            .expect(400)
        await request(app.getHttpServer())
            .put('/profile/home')
            .set(withAuth)
            .send({ ...prefs, groupOrder: 'injected' })
            .expect(400)
        await request(app.getHttpServer()).get('/profile/home').expect(401)
    })

    it('keeps recording reads and corrections inside the group, validates people and results, and preserves lifecycle state', async () => {
        const { groupId, personIds } = await createGroupWithPeople()
        const created = await request(app.getHttpServer())
            .post('/sessions')
            .set(withAuth)
            .send({
                groupId,
                sessionDate: '2026-10-03T12:00:00.000Z',
                timezone: 'Europe/Madrid',
                groupPersonIds: personIds,
                games: [{ gameId: 10, participantPersonIds: personIds }],
            })
            .expect(201)
        const id = Number(created.body.sessionId)
        const recording = (await request(app.getHttpServer()).get(`/sessions/${id}/recording`).set(withAuth).expect(200)).body
        const outsider = { Authorization: `Bearer ${sessionFor('user_outsider')}` }

        await request(app.getHttpServer()).get(`/sessions/${id}/recording`).set(outsider).expect(404)
        await request(app.getHttpServer()).put(`/sessions/${id}/recording`).set(outsider).send(recording).expect(404)
        await request(app.getHttpServer())
            .put(`/sessions/${id}/recording`)
            .set(withAuth)
            .send({ ...recording, groupId: 999999 })
            .expect(400)
        await request(app.getHttpServer())
            .put(`/sessions/${id}/recording`)
            .set(withAuth)
            .send({ ...recording, groupPersonIds: [999999] })
            .expect(400)
        await request(app.getHttpServer())
            .put(`/sessions/${id}/recording`)
            .set(withAuth)
            .send({ ...recording, status: 'active' })
            .expect(400)
        await request(app.getHttpServer())
            .put(`/sessions/${id}/plays/0/results`)
            .set(withAuth)
            .send({ revision: recording.revision, results: [{ groupPersonId: personIds[0], isWinner: true, score: 1.5 }] })
            .expect(400)
        expect((await request(app.getHttpServer()).get(`/sessions/${id}`).set(withAuth)).body.status).toBe('completed')
        expect((await request(app.getHttpServer()).get(`/sessions/${id}/recording`).set(withAuth)).body).toEqual(recording)
    })

    it('starts an unplanned live session in one request', async () => {
        const { groupId, personIds } = await createGroupWithPeople()
        const response = await request(app.getHttpServer())
            .post('/sessions/live')
            .set(withAuth)
            .send({ groupId, groupPersonIds: personIds, sessionDate: '2020-01-01T12:00:00Z', timezone: 'Europe/Madrid' })
            .expect(201)

        expect(response.body.status).toBe('active')
        const details = await request(app.getHttpServer()).get(`/sessions/${response.body.sessionId}`).set(withAuth).expect(200)

        expect(details.body.status).toBe('active')
        expect(
            details.body.participantStatuses.every((person: { attendanceStatus: string }) => person.attendanceStatus === 'attended'),
        ).toBe(true)
        expect(Math.abs(Date.parse(details.body.meetDate) - Date.now())).toBeLessThan(10000)
    })

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
