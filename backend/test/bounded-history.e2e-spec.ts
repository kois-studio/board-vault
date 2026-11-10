import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { DatabaseService } from './../src/modules/common/database/database.service.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

import type { MockInstance } from 'vitest'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'bounded-history.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
/** A date `days` from now, as the app stores them. */
const daysFromNow = (days: number) => `strftime('%Y-%m-%dT19:00:00.000Z', 'now', '${days} days')`
const ids = (from: number, to: number) => Array.from({ length: from - to + 1 }, (_, index) => from - index)

// #252: history comes a page at a time with totals of its own, and the game-night list stays bounded.
// Ana played 25 nights in Fridays (100-124), all over 70 days ago; 123 and 124 share a date, and so do 114 and 115.
// Brass was played every night, Azul twice on night 100. Ana won Brass on night 101.
// Bea came to night 100, a guest to night 102, and Bea again as a linked person to night 103.
describe('bounded history (e2e)', () => {
    let app: INestApplication
    let execute: MockInstance

    beforeAll(async () => {
        rmSync(testDatabasePath, { force: true })
        const sql = (input: string) => execFileSync('sqlite3', [testDatabasePath], { input, encoding: 'utf8' })

        sql(readFileSync(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8'))
        execFileSync(process.execPath, [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
            cwd: repositoryRoot,
            env: { ...process.env, TURSO_DATABASE_URL: `file:${testDatabasePath}`, TURSO_AUTH_TOKEN: '', MIGRATION_BASELINE: '0005' },
            encoding: 'utf8',
        })
        const history = ids(124, 100)
        // A night's day: 123 and 124 share one, and so do 114 and 115.
        const day = (id: number) => -100 + (id === 124 ? 23 : id === 115 ? 14 : id - 100)

        sql(`
            INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                (1, 'ana@example.test', 'anaplays', ${avatar}, 'Ana', 'user_ana', 0, 0),
                (2, 'bea@example.test', 'beaplays', ${avatar}, 'Bea', 'user_bea', 0, 0),
                (3, 'cai@example.test', 'caiplays', ${avatar}, 'Cai', 'user_cai', 0, 0);
            INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                (1, 'https://example.test/1.jpg', 45, 2, 4), (2, 'https://example.test/2.jpg', 60, 2, 4);
            INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES (1, 'en', 'Azul', 'azul'), (2, 'en', 'Brass', 'brass');
            INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary)
            SELECT gameId, languageCode, title, normalizedTitle, 1 FROM GameTranslation;

            -- Fridays (10) is Ana's and Bea's; Cai's (11) is not Ana's; Ana left Old (12); Recent (14) is Ana's.
            INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 1), (11, 'Cai', 3), (12, 'Old', 3), (14, 'Recent', 1);
            INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10), (3, 11), (3, 12), (1, 14);
            INSERT INTO GroupPerson (id, groupId, accountId, kind, displayName, createdByAccountId) VALUES
                (500, 10, NULL, 'placeholder', 'Guest', 1), (501, 10, 2, 'linked', 'Bea', 2);

            INSERT INTO Meet (id, groupId, createdBy, meetDate, status) VALUES
                ${history.map(id => `(${id}, 10, 1, ${daysFromNow(day(id))}, 'completed')`).join(', ')};
            INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES
                ${history.map(id => `(${id}, 1, 'accepted', 'attended')`).join(', ')}, (100, 2, 'accepted', 'attended');
            INSERT INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus) VALUES
                (102, 500, 'accepted', 'attended'), (103, 501, 'accepted', 'attended');
            INSERT INTO MeetGame (meetId, gameId, gameStatus, playOrder) VALUES
                ${history.map(id => `(${id}, 2, 'played', 1)`).join(', ')}, (100, 1, 'played', 2);
            INSERT INTO MeetAccountGame (meetId, accountId, gameId) VALUES
                ${history.map(id => `(${id}, 1, 2)`).join(', ')}, (100, 1, 1);
            INSERT INTO MeetPlay (meetId, position, gameId, details) VALUES (100, 1, 1, '{}'), (100, 2, 1, '{}');
            INSERT INTO MeetGameResult (meetId, gameId, accountId, isWinner) VALUES (101, 2, 1, 1);

            -- Not Ana's history: a cancelled night, another group's, and one in a group she left.
            INSERT INTO Meet (id, groupId, createdBy, meetDate, status) VALUES
                (200, 10, 1, ${daysFromNow(-90)}, 'cancelled'),
                (210, 11, 3, ${daysFromNow(-90)}, 'completed'),
                (220, 12, 3, ${daysFromNow(-90)}, 'completed');
            INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES
                (200, 1, 'accepted', 'attended'), (210, 3, 'accepted', 'attended'), (220, 1, 'accepted', 'attended');

            -- For the game-night list: open nights however old, recent ones, and each group's last.
            INSERT INTO Meet (id, groupId, createdBy, meetDate, status) VALUES
                (300, 10, 1, ${daysFromNow(-400)}, 'scheduled'),
                (301, 10, 1, ${daysFromNow(0)}, 'active'),
                (302, 10, 1, ${daysFromNow(-10)}, 'cancelled'),
                (303, 10, 1, ${daysFromNow(-60)}, 'cancelled'),
                (304, 14, 1, ${daysFromNow(-5)}, 'completed'),
                (305, 14, 1, ${daysFromNow(-200)}, 'completed'),
                (306, 14, 1, ${daysFromNow(14)}, 'scheduled');
        `)

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
        execute = vi.spyOn(app.get(DatabaseService), 'execute')
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    const get = (path: string, clerkUserId = 'user_ana') =>
        request(app.getHttpServer())
            .get(path)
            .set({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

    type Page = { entries: Array<{ meetData: { id: number } }>; hasMore: boolean }
    const nightIds = (page: Page) => page.entries.map(entry => entry.meetData.id)

    it('pages history newest first down to the oldest night, through nights that share a date', async () => {
        const first: Page = (await get('/play/users/1/history/page?limit=10').expect(200)).body
        const second: Page = (await get('/play/users/1/history/page?limit=10&before=115').expect(200)).body
        const third: Page = (await get('/play/users/1/history/page?limit=10&before=105').expect(200)).body

        expect(nightIds(first)).toEqual(ids(124, 115))
        expect(first.hasMore).toBe(true)
        expect(nightIds(second)).toEqual(ids(114, 105))
        expect(second.hasMore).toBe(true)
        expect(nightIds(third)).toEqual(ids(104, 100))
        expect(third.hasMore).toBe(false)
    })

    it('leaves out cancelled nights, other groups, and groups the account left', async () => {
        const all: Page = (await get('/play/users/1/history/page?limit=50').expect(200)).body

        expect(nightIds(all)).toEqual(ids(124, 100))
    })

    it('answers a page with 20 nights by default, the same queries for any page, and filters by group or game', async () => {
        execute.mockClear()
        const page: Page = (await get('/play/users/1/history/page').expect(200)).body
        const firstPageQueries = execute.mock.calls.length

        execute.mockClear()
        await get('/play/users/1/history/page?before=105').expect(200)

        expect(nightIds(page)).toEqual(ids(124, 105))
        expect(execute.mock.calls.length).toBe(firstPageQueries)
        expect(nightIds((await get('/play/users/1/history/page?gameId=1').expect(200)).body)).toEqual([100])
        expect(nightIds((await get('/play/users/1/history/page?groupId=10&limit=1').expect(200)).body)).toEqual([124])
        expect((await get('/play/users/1/history/page?groupId=14').expect(200)).body).toEqual({ entries: [], hasMore: false })
    })

    it('still answers the previous release with every night at once, newest first', async () => {
        const all: Array<{ meetData: { id: number } }> = (await get('/play/users/1/history').expect(200)).body

        expect(all.map(entry => entry.meetData.id)).toEqual(ids(124, 100))
        await get('/play/users/1/history', 'user_bea').expect(403)
    })

    it('refuses pages it cannot serve, and other people’s history', async () => {
        await get('/play/users/1/history/page?limit=0').expect(400)
        await get('/play/users/1/history/page?limit=51').expect(400)
        await get('/play/users/1/history/page?page=2').expect(400)
        await get('/play/users/1/history/page', 'user_bea').expect(403)
        await get('/play/users/1/history/summary', 'user_bea').expect(403)
    })

    it('sums up the whole history: nights, plays, games, people once each, and the most played games', async () => {
        expect((await get('/play/users/1/history/summary').expect(200)).body).toEqual({
            nights: 25,
            gamesPlayed: 27,
            uniqueGames: 2,
            // Ana, Bea (as herself and as a linked person) and the guest.
            people: 3,
            mostPlayed: { game: expect.objectContaining({ id: 2, title: 'Brass' }), nights: 25 },
            myMostPlayed: [
                { game: expect.objectContaining({ id: 2, title: 'Brass' }), plays: 25, wins: 1 },
                { game: expect.objectContaining({ id: 1, title: 'Azul' }), plays: 2, wins: 0 },
            ],
        })
        // The nights a game was played on, which the game page counts; their totals cover the whole night.
        expect((await get('/play/users/1/history/summary?gameId=1').expect(200)).body).toMatchObject({
            nights: 1,
            gamesPlayed: 3,
            uniqueGames: 2,
        })
        expect((await get('/play/users/1/history/summary?groupId=14').expect(200)).body).toEqual({
            nights: 0,
            gamesPlayed: 0,
            uniqueGames: 0,
            people: 0,
            mostPlayed: null,
            myMostPlayed: [],
        })
    })

    it('lists open nights, the last 30 days, and each group’s last completed night, newest first', async () => {
        const meets: Array<{ id: number }> = (await get('/play/users/1/meets').expect(200)).body

        expect(meets.map(meet => meet.id)).toEqual([306, 301, 304, 302, 124, 300])
    })

    it('finds one group’s nights around an older day, with the records of the completed ones', async () => {
        // Night 110 was 90 days ago, with 109 the day before and 111 the day after; the cancelled 200 shares its date.
        const day = new Date(Date.now() - 90 * 86_400_000).toISOString().slice(0, 10)
        const around: {
            meets: Array<{ id: number; status: string }>
            records: Array<{ meetData: { id: number }; gamesPlayed: Array<unknown> }>
        } = (await get(`/play/users/1/meets/around?groupId=10&date=${day}`).expect(200)).body

        expect(around.meets.map(meet => meet.id)).toEqual([111, 200, 110, 109])
        expect(around.meets[2]).toMatchObject({
            id: 110,
            groupId: 10,
            status: 'completed',
            notes: null,
            timezone: expect.any(String),
            isConfirmed: expect.any(Boolean),
        })
        expect(around.records.map(record => record.meetData.id)).toEqual([111, 110, 109])
        expect(around.records[0]!.gamesPlayed).toHaveLength(1)

        // Another group's nights on that day are not Ana's to see.
        expect((await get(`/play/users/1/meets/around?groupId=11&date=${day}`).expect(200)).body).toEqual({ meets: [], records: [] })
    })

    it('refuses a day or group it cannot read, and other people’s nights', async () => {
        await get('/play/users/1/meets/around?groupId=10&date=2026-02-30').expect(400)
        await get('/play/users/1/meets/around?groupId=10&date=20260920').expect(400)
        await get('/play/users/1/meets/around?date=2026-09-20').expect(400)
        await get('/play/users/1/meets/around?groupId=10&date=2026-09-20&limit=5').expect(400)
        await get('/play/users/1/meets/around?groupId=10&date=2026-09-20', 'user_bea').expect(403)
    })
})
