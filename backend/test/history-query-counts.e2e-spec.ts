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
const testDatabasePath = resolve(__dirname, 'history-query-counts.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const night = (day: string) => `'${day}T19:00:00.000Z'`

// The history of nights in several groups costs as many queries as the history of one: each group's people are read
// together, not once per group. Ana played in three groups:
// - Fridays (night 100): Bea, Guest, and Bea's own person, linked to her account;
// - Weekend (night 110): Cai, Lucía, and Gone, archived since;
// - Family (night 120): Dan and Mar.
// Eve played one night (200) in her own group with Fay and her guest Pip.
describe('history in a fixed number of queries (e2e)', () => {
    let app: INestApplication
    let calls: Array<MockInstance>
    let peopleReads: MockInstance

    beforeAll(async () => {
        rmSync(testDatabasePath, { force: true })
        const sql = (input: string) => execFileSync('sqlite3', [testDatabasePath], { input, encoding: 'utf8' })

        sql(readFileSync(resolve(repositoryRoot, 'database/schema/schema.sql'), 'utf8'))
        execFileSync(process.execPath, [resolve(repositoryRoot, 'database/scripts/migrate.mjs')], {
            cwd: repositoryRoot,
            env: { ...process.env, TURSO_DATABASE_URL: `file:${testDatabasePath}`, TURSO_AUTH_TOKEN: '', MIGRATION_BASELINE: '0005' },
            encoding: 'utf8',
        })
        sql(`
            INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                (1, 'ana@example.test', 'anaplays', ${avatar}, 'Ana', 'user_ana', 0, 0),
                (2, 'bea@example.test', 'beaplays', ${avatar}, 'Bea', 'user_bea', 0, 0),
                (3, 'cai@example.test', 'caiplays', ${avatar}, 'Cai', 'user_cai', 0, 0),
                (4, 'dan@example.test', 'danplays', ${avatar}, 'Dan', 'user_dan', 0, 0),
                (5, 'eve@example.test', 'eveplays', ${avatar}, 'Eve', 'user_eve', 0, 0),
                (6, 'fay@example.test', 'fayplays', ${avatar}, 'Fay', 'user_fay', 0, 0);
            INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                (1, 'https://example.test/1.jpg', 45, 2, 4), (2, 'https://example.test/2.jpg', 60, 2, 4),
                (3, 'https://example.test/3.jpg', 30, 2, 6);
            INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES
                (1, 'en', 'Azul', 'azul'), (2, 'en', 'Brass', 'brass'), (3, 'en', 'Codenames', 'codenames');
            INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary)
            SELECT gameId, languageCode, title, normalizedTitle, 1 FROM GameTranslation;

            INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 1), (11, 'Weekend', 1), (12, 'Family', 1), (20, 'Eve', 5);
            INSERT INTO GroupMembership (accountId, groupId) VALUES
                (1, 10), (2, 10), (1, 11), (3, 11), (1, 12), (4, 12), (5, 20), (6, 20);
            INSERT INTO GroupPerson (id, groupId, accountId, kind, status, displayName, createdByAccountId) VALUES
                (500, 10, NULL, 'placeholder', 'active', 'Guest', 1),
                (501, 10, 2, 'linked', 'active', 'Bea', 2),
                (510, 11, NULL, 'placeholder', 'active', 'Lucía', 1),
                (511, 11, NULL, 'placeholder', 'archived', 'Gone', 1),
                (520, 12, NULL, 'placeholder', 'active', 'Mar', 1),
                (600, 20, NULL, 'placeholder', 'active', 'Pip', 5);

            INSERT INTO Meet (id, groupId, createdBy, meetDate, status) VALUES
                (100, 10, 1, ${night('2026-09-18')}, 'completed'),
                (110, 11, 1, ${night('2026-09-20')}, 'completed'),
                (120, 12, 1, ${night('2026-09-22')}, 'completed'),
                (200, 20, 5, ${night('2026-09-20')}, 'completed');
            INSERT INTO MeetAttendee (meetId, accountId, rsvpStatus, attendanceStatus) VALUES
                (100, 1, 'accepted', 'attended'), (100, 2, 'accepted', 'attended'),
                (110, 1, 'accepted', 'attended'), (110, 3, 'accepted', 'attended'),
                (120, 1, 'accepted', 'attended'), (120, 4, 'accepted', 'attended'),
                (200, 5, 'accepted', 'attended'), (200, 6, 'accepted', 'attended');
            INSERT INTO MeetPersonAttendee (meetId, groupPersonId, rsvpStatus, attendanceStatus) VALUES
                (100, 500, 'accepted', 'attended'), (100, 501, 'accepted', 'attended'),
                (110, 510, 'accepted', 'attended'), (110, 511, 'accepted', 'attended'),
                (120, 520, 'accepted', 'attended'),
                (200, 600, 'accepted', 'attended');
            INSERT INTO MeetGame (meetId, gameId, gameStatus, playOrder) VALUES
                (100, 1, 'played', 1), (110, 2, 'played', 1), (120, 3, 'played', 1), (120, 1, 'played', 2), (200, 2, 'played', 1);
            INSERT INTO MeetAccountGame (meetId, accountId, gameId) VALUES
                (100, 1, 1), (100, 2, 1), (110, 1, 2), (110, 3, 2), (120, 1, 3), (120, 4, 3), (120, 1, 1), (200, 5, 2), (200, 6, 2);
            INSERT INTO MeetGameResult (meetId, gameId, accountId, isWinner) VALUES (110, 2, 3, 1), (200, 2, 6, 1);
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
        const database = app.get(DatabaseService)

        // Every way a query reaches the database, not just single statements.
        calls = [vi.spyOn(database, 'execute'), vi.spyOn(database, 'batch'), vi.spyOn(database, 'transaction')]
        peopleReads = vi.spyOn(database.groups, 'getGroupPeopleByGroupIds')
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

    /** The queries one request issued, and its body, with account resolution already warm (#250). */
    async function queriesFor(path: string, clerkUserId: string) {
        await request(app.getHttpServer()).get('/auth/clerk/status').set(as(clerkUserId)).expect(200)
        for (const spy of [...calls, peopleReads]) spy.mockClear()
        const response = await request(app.getHttpServer()).get(path).set(as(clerkUserId)).expect(200)
        const queries = calls.reduce((sum, spy) => sum + spy.mock.calls.length, 0)

        return { queries, body: response.body }
    }

    type HistoryRecord = {
        meetData: { id: number }
        attendedByPeople: Array<{ id: number; displayName: string; accountId: number | null; avatar: unknown }>
        gamesPlayed: Array<{ playedBy: Array<{ id: number }> }>
    }
    const people = (records: Array<HistoryRecord>) =>
        Object.fromEntries(records.map(record => [record.meetData.id, record.attendedByPeople.map(person => person.displayName).sort()]))

    it.each([
        ['a page of history', '/play/users/5/history/page', '/play/users/1/history/page'],
        ['the whole history (deprecated)', '/play/users/5/history', '/play/users/1/history'],
    ])('reads %s of nights in three groups in as many queries as of one night in one group', async (_name, small, large) => {
        const few = await queriesFor(small, 'user_eve')
        const lots = await queriesFor(large, 'user_ana')

        // Every group's people in one read.
        expect(peopleReads).toHaveBeenCalledTimes(1)
        expect(peopleReads).toHaveBeenCalledWith(expect.arrayContaining([10, 11, 12]), true)

        expect(few.queries).toBeGreaterThan(0)
        expect(lots.queries).toBe(few.queries)
    })

    it('names the people of each night from its own group, archived ones included', async () => {
        const { body } = await queriesFor('/play/users/1/history/page', 'user_ana')

        expect(body.entries.map((record: HistoryRecord) => record.meetData.id)).toEqual([120, 110, 100])
        expect(people(body.entries)).toEqual({ 100: ['Bea', 'Guest'], 110: ['Gone', 'Lucía'], 120: ['Mar'] })
    })

    it("shows a linked person with their account's avatar", async () => {
        const { body } = await queriesFor('/play/users/1/history', 'user_ana')
        const bea = body
            .find((record: HistoryRecord) => record.meetData.id === 100)
            .attendedByPeople.find((person: { id: number }) => person.id === 501)

        expect(bea).toEqual(expect.objectContaining({ accountId: 2, avatar: expect.objectContaining({ emoji: '😎' }) }))
    })

    it("answers one group's nights around a date, and a group's history, with that group's people", async () => {
        const around = await queriesFor('/play/users/1/meets/around?groupId=11&date=2026-09-20', 'user_ana')
        const meetings = await queriesFor('/dashboard/users/1/groups/11/meetings', 'user_ana')

        expect(people(around.body.records)).toEqual({ 110: ['Gone', 'Lucía'] })
        expect(people(meetings.body)).toEqual({ 110: ['Gone', 'Lucía'] })
    })
})
