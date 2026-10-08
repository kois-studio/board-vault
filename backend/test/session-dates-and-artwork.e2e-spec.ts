import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { ArtworkDownloader } from './../src/modules/core/artwork/artwork-downloader.js'
import { FakeArtworkDownloader } from './fake-artwork-downloader.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'session-dates-and-artwork.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

describe('session dates, last played, and artwork addresses (e2e)', () => {
    let app: INestApplication
    const previousTimeZone = process.env.TZ

    beforeAll(async () => {
        // A server outside UTC is where a zoneless stored date used to be misread.
        process.env.TZ = 'Europe/Madrid'
        rmSync(testDatabasePath, { force: true })
        const schema = readFileSync(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8')

        execFileSync('sqlite3', [testDatabasePath], { input: schema, encoding: 'utf8' })
        execFileSync(process.execPath, [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
            cwd: repositoryRoot,
            env: { ...process.env, TURSO_DATABASE_URL: `file:${testDatabasePath}`, TURSO_AUTH_TOKEN: '', MIGRATION_BASELINE: '0005' },
            encoding: 'utf8',
        })
        // Ana and Ben play in Thursdays (10) and Weekends (11). Session dates use the three stored shapes:
        // SQLite's zoneless CURRENT_TIMESTAMP, the app's ISO with Z, and a seed script's +02:00 offset.
        execFileSync('sqlite3', [testDatabasePath], {
            input: `
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                    (1, 'ana@example.test', 'anaplays', ${avatar}, 'Ana Ruiz', 'user_ana', 0, 0),
                    (2, 'ben@example.test', 'benplays', ${avatar}, 'Ben Soto', 'user_ben', 0, 0),
                    (3, 'cleo@example.test', 'cleoadmin', ${avatar}, 'Cleo Mora', 'user_cleo', 1, 0);

                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Thursdays', 1), (11, 'Weekends', 1);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10), (1, 11), (2, 11);
                INSERT INTO GroupPerson (id, groupId, accountId, kind, status, displayName, createdByAccountId) VALUES
                    (100, 10, 1, 'linked', 'active', 'Ana Ruiz', 1),
                    (101, 10, 2, 'linked', 'active', 'Ben Soto', 1);

                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                    (1, 'https://example.test/azul.jpg', 45, 2, 4),
                    (2, 'https://example.test/catan.jpg', 60, 2, 4);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES
                    (1, 'en', 'Azul', 'azul'), (2, 'en', 'Catan', 'catan');
                INSERT INTO OwnedGame (accountId, gameId) VALUES (1, 1), (2, 2);

                -- Thursdays, recorded with group people by the session wizard: Ana played Azul.
                INSERT INTO Meet (id, groupId, createdBy, meetDate, isConfirmed, status, timezone)
                    VALUES (50, 10, 1, '2026-09-20 19:30:00', TRUE, 'completed', 'Europe/Madrid');
                INSERT INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus) VALUES (50, 100, 'accepted', 'attended');
                INSERT INTO MeetGame (meetId, gameId, gameStatus) VALUES (50, 1, 'played');
                INSERT INTO MeetPersonGame (meetId, groupPersonId, gameId) VALUES (50, 100, 1);

                -- Thursdays, half an hour earlier, recorded with accounts: Ben played Catan.
                INSERT INTO Meet (id, groupId, createdBy, meetDate, isConfirmed, status, timezone)
                    VALUES (51, 10, 1, '2026-09-20T19:00:00.000Z', TRUE, 'completed', 'Europe/Madrid');
                INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES (51, 2, 'accepted', 'attended');
                INSERT INTO MeetGame (meetId, gameId, gameStatus) VALUES (51, 2, 'played');
                INSERT INTO MeetAccountGame (meetId, accountId, gameId) VALUES (51, 2, 2);

                -- Thursdays, earlier, from a seed script: Ana played Azul by account.
                INSERT INTO Meet (id, groupId, createdBy, meetDate, isConfirmed, status, timezone)
                    VALUES (52, 10, 1, '2026-09-10T20:00:00+02:00', TRUE, 'completed', 'Europe/Madrid');
                INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES (52, 1, 'accepted', 'attended');
                INSERT INTO MeetGame (meetId, gameId, gameStatus) VALUES (52, 1, 'played');
                INSERT INTO MeetAccountGame (meetId, accountId, gameId) VALUES (52, 1, 1);

                -- Weekends, the latest of all: Ana played Azul in the other group.
                INSERT INTO Meet (id, groupId, createdBy, meetDate, isConfirmed, status, timezone)
                    VALUES (53, 11, 1, '2026-09-27T18:00:00.000Z', TRUE, 'completed', 'Europe/Madrid');
                INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES (53, 1, 'accepted', 'attended');
                INSERT INTO MeetGame (meetId, gameId, gameStatus) VALUES (53, 1, 'played');
                INSERT INTO MeetAccountGame (meetId, accountId, gameId) VALUES (53, 1, 1);
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
            .overrideProvider(ArtworkDownloader)
            .useValue(new FakeArtworkDownloader())
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
        process.env.TZ = previousTimeZone
    })

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

    describe('session dates', () => {
        it('answers every stored shape as ISO in UTC, reading a zoneless date as UTC', async () => {
            const meets = (await request(app.getHttpServer()).get('/play/users/1/meets').set(as('user_ana')).expect(200)).body as Array<{
                id: number
                meetDate: string
            }>
            const dates = Object.fromEntries(meets.map(meet => [meet.id, meet.meetDate]))

            expect(dates).toEqual({
                50: '2026-09-20T19:30:00.000Z',
                51: '2026-09-20T19:00:00.000Z',
                52: '2026-09-10T18:00:00.000Z',
                53: '2026-09-27T18:00:00.000Z',
            })

            const session = (await request(app.getHttpServer()).get('/sessions/50').set(as('user_ana')).expect(200)).body

            expect(session.meetDate).toBe('2026-09-20T19:30:00.000Z')
        })

        it('dates history in ISO too, so the app orders it by instant whatever shape each date was stored in', async () => {
            const history = (await request(app.getHttpServer()).get('/play/users/1/history').set(as('user_ana')).expect(200))
                .body as Array<{
                meetData: { id: number; meetDate: string }
            }>
            const newestFirst = [...history].sort((a, b) => Date.parse(b.meetData.meetDate) - Date.parse(a.meetData.meetDate))

            // Ana took part in 50, 52 and 53; Ben alone played 51.
            expect(newestFirst.map(record => record.meetData.id)).toEqual([53, 50, 52])
            expect(newestFirst.map(record => record.meetData.meetDate)).toEqual([
                '2026-09-27T18:00:00.000Z',
                '2026-09-20T19:30:00.000Z',
                '2026-09-10T18:00:00.000Z',
            ])
        })
    })

    describe('last played', () => {
        const lastPlayedOf = (body: {
            recommendations: Array<{ gameData: { id: number }; explanation: { lastPlayedAt: string | null } }>
        }) =>
            Object.fromEntries(
                body.recommendations.map(recommendation => [recommendation.gameData.id, recommendation.explanation.lastPlayedAt]),
            )

        it('counts this group’s nights recorded with group people, and not other groups’ nights', async () => {
            const response = await request(app.getHttpServer())
                .post('/play/recommendations/participants')
                .set(as('user_ana'))
                .send({ groupId: 10, groupPersonIds: [100, 101] })
                .expect(201)

            // Azul: Thursdays' last night is the wizard's (20 Sep), not Weekends' later one (27 Sep).
            expect(lastPlayedOf(response.body)).toEqual({ 1: '2026-09-20T19:30:00.000Z', 2: '2026-09-20T19:00:00.000Z' })
        })

        it('answers the same when the group is chosen by accounts', async () => {
            const response = await request(app.getHttpServer())
                .post('/play/recommendations')
                .set(as('user_ana'))
                .send({ groupId: 10, attendeeIds: [1, 2] })
                .expect(201)

            expect(lastPlayedOf(response.body)).toEqual({ 1: '2026-09-20T19:30:00.000Z', 2: '2026-09-20T19:00:00.000Z' })
        })

        it('dates the group’s most played games in ISO', async () => {
            const insights = (await request(app.getHttpServer()).get('/groups/10/insights').set(as('user_ana')).expect(200)).body as {
                mostPlayed: Array<{ gameData: { id: number }; lastPlayedAt: string }>
            }

            expect(insights.mostPlayed.find(entry => entry.gameData.id === 1)?.lastPlayedAt).toBe('2026-09-20T19:30:00.000Z')
        })
    })

    describe('artwork addresses', () => {
        it('rejects a proposal whose artwork is not a web address', async () => {
            const propose = (imageUrl: string) =>
                request(app.getHttpServer())
                    .post('/profile/users/1/proposals')
                    .set(as('user_ana'))
                    .send({ title: `Root ${imageUrl.length}`, imageUrl })

            await propose('javascript:alert(1)').expect(400)
            await propose('/images/root.png').expect(400)
            await propose('https://example.test/root.jpg').expect(201)
            await propose('').expect(201)
        })

        it('rejects game artwork from an admin that is not a web address, and still allows removing it', async () => {
            const update = (imageUrl: string) =>
                request(app.getHttpServer()).patch('/admin/games/2').set(as('user_cleo')).send({ imageUrl })

            await update('not a url').expect(400)
            await update('https://example.test/catan-new.jpg').expect(200)
            await update('').expect(200)
        })
    })

    // Last: it adds a session, which the date and last-played checks above do not expect.
    describe('notifications', () => {
        it('tells the other invitees when a night is planned and when it starts, never the organizer', async () => {
            const notificationsOf = async (userId: number, clerkUserId: string) =>
                (await request(app.getHttpServer()).get(`/profile/users/${userId}/notifications`).set(as(clerkUserId)).expect(200))
                    .body as Array<{ type: string; message: string; data: { meeting?: number } }>

            const created = (
                await request(app.getHttpServer())
                    .post('/sessions/scheduled')
                    .set(as('user_ana'))
                    .send({ groupId: 11, sessionDate: '2099-10-09T17:00:00.000Z', timezone: 'Europe/Madrid', attendeeIds: [1, 2] })
                    .expect(201)
            ).body as { sessionId: number }

            const planned = await notificationsOf(2, 'user_ben')

            expect(planned).toEqual([
                expect.objectContaining({
                    type: 'meeting_scheduled',
                    message: 'Ana Ruiz planned a game night in Weekends for Fri 9 Oct, 19:00. Can you make it?',
                    data: expect.objectContaining({ meeting: created.sessionId, group: 11 }),
                }),
            ])

            await request(app.getHttpServer())
                .patch(`/sessions/${created.sessionId}/status`)
                .set(as('user_ana'))
                .send({ status: 'active' })
                .expect(200)

            expect((await notificationsOf(2, 'user_ben')).map(notification => notification.type).sort()).toEqual([
                'meeting_scheduled',
                'session_started',
            ])
            expect(await notificationsOf(1, 'user_ana')).toEqual([])
        })
    })
})
