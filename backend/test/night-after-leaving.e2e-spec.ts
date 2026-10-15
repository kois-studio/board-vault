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
const testDatabasePath = resolve(__dirname, 'night-after-leaving.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

/**
 * Votes, "I'll bring it" (#114, #115) and the night's notifications belong to people still coming.
 * Olga owns Fridays; Paula organizes. Rita owns Azul and Samuel owns Catan; both voted and said they
 * would bring their game. Samuel declines night 60, Paula takes Rita off night 61, and Rita leaves the
 * group while night 63 is under way and nights 62 and 64 are planned.
 */
describe('a night after someone declines, is uninvited or leaves the group (e2e)', () => {
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
        const night = (id: number, status = 'scheduled', date = '2026-12-18T19:00:00.000Z') =>
            `(${id}, 10, 2, '${date}', 0, '${status}', 'Europe/Madrid')`
        const accountNight = (id: number) => `
            INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES
                (${id}, 2, 'accepted', 'unknown'), (${id}, 3, 'accepted', 'unknown'), (${id}, 4, 'accepted', 'unknown');
            INSERT INTO MeetGame (meetId, gameId, gameStatus, broughtByAccountId) VALUES (${id}, 1, 'planned', 3), (${id}, 2, 'planned', 4);
            INSERT INTO MeetGameVote (meetId, gameId, accountId) VALUES (${id}, 1, 3), (${id}, 1, 4), (${id}, 2, 4);`

        execFileSync('sqlite3', [testDatabasePath], {
            input: `
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                    (1, 'olga@example.test', 'olgaplays', ${avatar}, 'Olga', 'user_olga', 0, 0),
                    (2, 'pau@example.test', 'pauplays', ${avatar}, 'Paula', 'user_pau', 0, 0),
                    (3, 'rita@example.test', 'ritaplays', ${avatar}, 'Rita', 'user_rita', 0, 0),
                    (4, 'sam@example.test', 'samplays', ${avatar}, 'Samuel', 'user_sam', 0, 0);
                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 1);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10), (3, 10), (4, 10);
                INSERT INTO GroupPerson (id, groupId, accountId, kind, status, displayName, createdByAccountId) VALUES
                    (31, 10, 2, 'linked', 'active', 'Paula', 1), (32, 10, 3, 'linked', 'active', 'Rita', 1);
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (1, '', 45, 2, 4), (2, '', 90, 3, 4);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (1, 'en', 'Azul', 'azul'), (2, 'en', 'Catan', 'catan');
                INSERT INTO OwnedGame (accountId, gameId) VALUES (3, 1), (4, 2);
                INSERT INTO Meet (id, groupId, createdBy, meetDate, isConfirmed, status, timezone) VALUES
                    ${night(60)}, ${night(61)}, ${night(62)}, ${night(63, 'active', '2026-10-15T18:00:00.000Z')}, ${night(64)}, ${night(65)};
                ${accountNight(60)}
                ${accountNight(61)}
                ${accountNight(62)}
                ${accountNight(65)}
                INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES
                    (63, 2, 'accepted', 'unknown'), (63, 3, 'accepted', 'unknown'), (63, 4, 'accepted', 'unknown');
                -- Night 64 invites group people: Rita, through her group person, brings Azul.
                INSERT INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus) VALUES
                    (64, 31, 'accepted', 'unknown'), (64, 32, 'accepted', 'unknown');
                INSERT INTO MeetGame (meetId, gameId, gameStatus, broughtByPersonId) VALUES (64, 1, 'planned', 32);
                INSERT INTO MeetGameVote (meetId, gameId, accountId) VALUES (64, 1, 3), (64, 1, 2);
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

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
    const night = async (sessionId: number) =>
        (await request(app.getHttpServer()).get(`/sessions/${sessionId}`).set(as('user_olga')).expect(200)).body as {
            gameVotes: Array<{ gameId: number; accountIds: Array<number> }>
            gameBringers: Array<{ gameId: number; accountId: number | null; groupPersonId: number | null }>
        }
    const votes = async (sessionId: number) =>
        Object.fromEntries((await night(sessionId)).gameVotes.map(vote => [vote.gameId, [...vote.accountIds].sort()]))
    const bringers = async (sessionId: number) =>
        Object.fromEntries(
            (await night(sessionId)).gameBringers.map(bringer => [bringer.gameId, bringer.accountId ?? `person ${bringer.groupPersonId}`]),
        )

    it('drops the votes and games to bring of someone who declines, and keeps everyone else’s', async () => {
        await request(app.getHttpServer()).patch('/sessions/60/rsvp').set(as('user_sam')).send({ rsvpStatus: 'declined' }).expect(200)

        expect(await votes(60)).toEqual({ 1: [3] })
        expect(await bringers(60)).toEqual({ 1: 3 })
    })

    it('drops them for someone the organizer takes off the invite list', async () => {
        await request(app.getHttpServer())
            .patch('/sessions/61/attendees')
            .set(as('user_pau'))
            .send({ attendeeIds: [2, 4] })
            .expect(200)

        expect(await votes(61)).toEqual({ 1: [4], 2: [4] })
        expect(await bringers(61)).toEqual({ 2: 4 })
    })

    it('drops them for someone removed through the older meet-attendees route', async () => {
        await request(app.getHttpServer()).delete('/meetAttendees/65/4').set(as('user_pau')).expect(200)

        expect(await votes(65)).toEqual({ 1: [3] })
        expect(await bringers(65)).toEqual({ 1: 3 })
    })

    it('drops them on planned nights when someone leaves the group, by account and by group person', async () => {
        await request(app.getHttpServer()).delete('/dashboard/users/3/groups/10/members').set(as('user_rita')).expect(200)

        expect(await votes(62)).toEqual({ 1: [4], 2: [4] })
        expect(await bringers(62)).toEqual({ 2: 4 })
        expect(await votes(64)).toEqual({ 1: [2] })
        expect(await bringers(64)).toEqual({})
    })

    it('does not tell someone who left about the night they were invited to', async () => {
        // Night 63 was under way when Rita left: she keeps her place there, but is no longer in the group.
        await request(app.getHttpServer())
            .patch('/sessions/63/status')
            .set(as('user_pau'))
            .send({ status: 'completed', noGamesPlayed: true })
            .expect(200)

        const finished = await database.execute({
            sql: "SELECT accountId FROM Notification WHERE type = 'session_finished' ORDER BY accountId",
            args: [],
        })

        expect(finished.rows.map(row => Number(row.accountId))).toEqual([4])
    })
})
