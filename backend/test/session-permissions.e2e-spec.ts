import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'session-permissions.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

// ADR-0019: the organizer (or group owner) shapes the night; anyone coming can run it.
describe('session permissions (e2e)', () => {
    let app: INestApplication

    beforeAll(async () => {
        rmSync(testDatabasePath, { force: true })
        const schema = readFileSync(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8')

        execFileSync('sqlite3', [testDatabasePath], { input: schema, encoding: 'utf8' })
        execFileSync(process.execPath, [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
            cwd: repositoryRoot,
            env: { ...process.env, TURSO_DATABASE_URL: `file:${testDatabasePath}`, TURSO_AUTH_TOKEN: '', MIGRATION_BASELINE: '0005' },
            encoding: 'utf8',
        })
        // Olga owns Fridays; Paula planned night 60 and invited Rita and Samuel. Samuel can't make it. Tess is in the group, not invited.
        execFileSync('sqlite3', [testDatabasePath], {
            input: `
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                    (1, 'olga@example.test', 'olgaplays', ${avatar}, 'Olga', 'user_olga', 0, 0),
                    (2, 'pau@example.test', 'pauplays', ${avatar}, 'Paula', 'user_pau', 0, 0),
                    (3, 'rita@example.test', 'ritaplays', ${avatar}, 'Rita', 'user_rita', 0, 0),
                    (4, 'sam@example.test', 'samplays', ${avatar}, 'Samuel', 'user_sam', 0, 0),
                    (5, 'tess@example.test', 'tessplays', ${avatar}, 'Tess', 'user_tess', 0, 0);
                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 1);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10), (3, 10), (4, 10), (5, 10);
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (1, 'https://example.test/azul.jpg', 45, 2, 4);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (1, 'en', 'Azul', 'azul');
                INSERT INTO OwnedGame (accountId, gameId) VALUES (3, 1);
                INSERT INTO Meet (id, groupId, createdBy, meetDate, isConfirmed, status, timezone)
                    VALUES (60, 10, 2, '2026-10-09T17:00:00.000Z', 0, 'scheduled', 'Europe/Madrid');
                INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES
                    (60, 2, 'accepted', 'unknown'), (60, 3, 'accepted', 'unknown'), (60, 4, 'declined', 'unknown');
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
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
    const patch = (path: string, clerkUserId: string, body: object) =>
        request(app.getHttpServer()).patch(`/sessions/60/${path}`).set(as(clerkUserId)).send(body)
    const attendance = async () =>
        Object.fromEntries(
            (
                (await request(app.getHttpServer()).get('/sessions/60').set(as('user_pau')).expect(200)).body.attendeeStatuses as Array<{
                    accountId: number
                    attendanceStatus: string
                }>
            ).map(status => [status.accountId, status.attendanceStatus]),
        )

    it('keeps the invite list and the shortlist with the organizer and the group owner', async () => {
        await patch('attendees', 'user_rita', { attendeeIds: [2, 3, 5] }).expect(403)
        await patch('shortlist', 'user_rita', { plannedGameIds: [1] }).expect(403)
        await patch('shortlist', 'user_olga', { plannedGameIds: [1] }).expect(200)
    })

    it('does not let someone who declined, or was not invited, run the night', async () => {
        await patch('status', 'user_sam', { status: 'active' }).expect(403)
        await patch('status', 'user_tess', { status: 'active' }).expect(403)
    })

    it('lets the people coming vote for shortlisted games and add their own (#114)', async () => {
        const server = () => request(app.getHttpServer())
        // Azul (1) is on the shortlist from the first test; Rita owns it.
        await server().put('/sessions/60/votes/1').set(as('user_rita')).expect(200)
        const proposed = (await server().post('/sessions/60/shortlist/1').set(as('user_pau')).expect(201)).body

        expect(proposed).toEqual({ sessionId: 60, plannedGameIds: [1], gameVotes: [{ gameId: 1, accountIds: [3, 2] }] })
        await server().put('/sessions/60/votes/1').set(as('user_sam')).expect(403)
        await server().put('/sessions/60/votes/1').set(as('user_tess')).expect(403)

        await server().delete('/sessions/60/votes/1').set(as('user_rita')).expect(200)
        const details = (await server().get('/sessions/60').set(as('user_tess')).expect(200)).body
        expect(details.gameVotes).toEqual([{ gameId: 1, accountIds: [2] }])
    })

    it('lets the owner of a shortlisted game bring it, and clears that when they decline (#115)', async () => {
        const server = () => request(app.getHttpServer())
        const toBring = async () =>
            (
                (await server().get('/play/users/3/meets').set(as('user_rita')).expect(200)).body as Array<{
                    id: number
                    gamesToBring: Array<number>
                }>
            ).find(meet => meet.id === 60)?.gamesToBring

        // Rita owns Azul; Paula does not.
        await server().put('/sessions/60/games/1/bringer').set(as('user_pau')).send({}).expect(400)
        await server().put('/sessions/60/games/1/bringer').set(as('user_rita')).send({}).expect(200)
        expect(await toBring()).toEqual([1])
        expect((await server().get('/sessions/60').set(as('user_pau')).expect(200)).body.gameBringers).toEqual([
            { gameId: 1, accountId: 3, groupPersonId: null },
        ])

        await server().patch('/sessions/60/rsvp').set(as('user_rita')).send({ rsvpStatus: 'declined' }).expect(200)
        expect(await toBring()).toEqual([])
        await server().patch('/sessions/60/rsvp').set(as('user_rita')).send({ rsvpStatus: 'accepted' }).expect(200)
    })

    it('lets an invitee who is coming start the night and record play, and players count as there', async () => {
        await patch('status', 'user_rita', { status: 'active' }).expect(200)
        await patch('played-games', 'user_rita', { playedGameIds: [1], games: [{ gameId: 1, participantIds: [3] }] }).expect(200)

        expect(await attendance()).toMatchObject({ 3: 'attended' })

        // Unticking a player in the attendance list does not undo it.
        await patch('attendance', 'user_pau', { attendedIds: [2] }).expect(200)
        expect(await attendance()).toEqual({ 2: 'attended', 3: 'attended', 4: 'absent' })
    })

    it('lets only the organizer or the group owner cancel', async () => {
        await patch('status', 'user_rita', { status: 'cancelled' }).expect(403)
        await patch('status', 'user_olga', { status: 'cancelled' }).expect(200)
    })
})
