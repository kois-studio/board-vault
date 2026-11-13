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
const testDatabasePath = resolve(__dirname, 'dashboard-query-counts.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const twelve = Array.from({ length: 12 }, (_, index) => index + 1)
const rows = (ids: Array<number>, row: (id: number) => string) => ids.map(row).join(', ')

// #289: every read of the dashboard costs the same number of queries for one small group as for several large ones.
// Eve is alone in her group, with one game and one rating. Ada is in three groups:
// - Tuesday: Ada, Bea, Cai, Dan and Fay, and Mar, a person without an account;
// - Weekend: Ada, Cai and Gus;
// - Family: Ada and Hal, Lucía without an account, and an archived person.
// Between them they own eleven games and rate six. Ugo is in no group, but rated a game the groups own.
describe('dashboard reads in a fixed number of queries (e2e, #289)', () => {
    let app: INestApplication
    let database: DatabaseService
    let calls: Array<MockInstance>

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
                (1, 'ada@example.test', 'adaplays', ${avatar}, 'Ada', 'user_ada', 0, 0),
                (2, 'bea@example.test', 'beaplays', ${avatar}, 'Bea', 'user_bea', 0, 0),
                (3, 'cai@example.test', 'caiplays', ${avatar}, 'Cai', 'user_cai', 0, 0),
                (4, 'dan@example.test', 'danplays', ${avatar}, 'Dan', 'user_dan', 0, 0),
                (5, 'eve@example.test', 'eveplays', ${avatar}, 'Eve', 'user_eve', 0, 0),
                (6, 'fay@example.test', 'fayplays', ${avatar}, 'Fay', 'user_fay', 0, 0),
                (7, 'gus@example.test', 'gusplays', ${avatar}, 'Gus', 'user_gus', 0, 0),
                (8, 'hal@example.test', 'halplays', ${avatar}, 'Hal', 'user_hal', 0, 0),
                (9, 'ugo@example.test', 'ugoplays', ${avatar}, 'Ugo', 'user_ugo', 0, 0);
            INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                ${rows(twelve, id => `(${id}, 'https://example.test/${id}.jpg', 45, 2, 4)`)};
            INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES
                ${rows(twelve, id => `(${id}, 'en', 'Game ${String(id).padStart(2, '0')}', 'game-${id}', 1)`)};

            INSERT INTO UserGroup (id, name, createdBy) VALUES
                (10, 'Tuesday', 1), (11, 'Weekend', 1), (12, 'Family', 1), (20, 'Eve''s table', 5);
            -- Joined out of id order, as people do.
            INSERT INTO GroupMembership (accountId, groupId, joinedAt) VALUES
                (1, 10, '2026-01-01 10:00:00'), (6, 10, '2026-01-02 10:00:00'), (3, 10, '2026-01-03 10:00:00'),
                (2, 10, '2026-01-04 10:00:00'), (4, 10, '2026-01-05 10:00:00'),
                (1, 11, '2026-02-01 10:00:00'), (7, 11, '2026-02-02 10:00:00'), (3, 11, '2026-02-03 10:00:00'),
                (1, 12, '2026-03-01 10:00:00'), (8, 12, '2026-03-02 10:00:00'),
                (5, 20, '2026-04-01 10:00:00');
            INSERT INTO OwnedGame (accountId, gameId, purchasePrice) VALUES
                (1, 2, 30), (1, 1, 20), (2, 2, NULL), (2, 3, NULL), (3, 6, NULL), (3, 4, NULL), (3, 5, NULL),
                (4, 7, NULL), (6, 8, NULL), (6, 9, NULL), (7, 10, NULL), (8, 11, NULL), (5, 12, 15);
            INSERT INTO GameReview (accountId, gameId, review) VALUES
                (1, 1, 10), (2, 2, 7), (3, 4, 9), (4, 7, 5), (7, 10, 6), (8, 11, 8), (5, 12, 6), (9, 2, 3);
            INSERT INTO GroupPerson (id, groupId, kind, status, displayName, createdByAccountId) VALUES
                (40, 12, 'placeholder', 'active', 'Lucía', 1),
                (41, 12, 'placeholder', 'archived', 'Gone', 1),
                (42, 10, 'placeholder', 'active', 'Mar', 1);
            INSERT INTO GroupPersonGameOwnership (groupPersonId, gameId, status, enteredByAccountId) VALUES
                (40, 3, 'asserted', 1), (41, 1, 'asserted', 1), (42, 9, 'asserted', 1);
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
        database = app.get(DatabaseService)
        // Every way a query reaches the database, not just single statements.
        calls = [vi.spyOn(database, 'execute'), vi.spyOn(database, 'batch'), vi.spyOn(database, 'transaction')]
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

    /** The queries one request issued, and its body, with account resolution already warm (#250). */
    async function queriesFor(path: string, clerkUserId: string) {
        await request(app.getHttpServer()).get('/auth/clerk/status').set(as(clerkUserId)).expect(200)
        for (const spy of calls) spy.mockClear()
        const response = await request(app.getHttpServer()).get(path).set(as(clerkUserId)).expect(200)
        const queries = calls.reduce((sum, spy) => sum + spy.mock.calls.length, 0)

        return { queries, body: response.body }
    }

    it.each([
        ['your stats', '/dashboard/users/5/stats', '/dashboard/users/1/stats'],
        ['your groups, as overviews', '/dashboard/users/5/group-overviews', '/dashboard/users/1/group-overviews'],
        ['one group, as an overview', '/dashboard/users/5/group-overviews/20', '/dashboard/users/1/group-overviews/10'],
        ["a group's shelf", '/dashboard/users/5/groups/20/shelf', '/dashboard/users/1/groups/10/shelf'],
        ['your groups with every game (deprecated)', '/dashboard/users/5/groups', '/dashboard/users/1/groups'],
        ['one group with every game (deprecated)', '/dashboard/users/5/groups/20', '/dashboard/users/1/groups/10'],
    ])('reads %s in as many queries for three large groups as for one small one', async (_name, small, large) => {
        const few = await queriesFor(small, 'user_eve')
        const lots = await queriesFor(large, 'user_ada')

        expect(few.queries).toBeGreaterThan(0)
        expect(lots.queries).toBe(few.queries)
    })

    it('answers every group with its members in the order of their accounts, and its active people', async () => {
        const { body } = await queriesFor('/dashboard/users/1/group-overviews', 'user_ada')

        expect(body.map((group: { name: string }) => group.name)).toEqual(['Tuesday', 'Weekend', 'Family'])
        expect(body.map((group: { members: Array<{ id: number }> }) => group.members.map(member => member.id))).toEqual([
            [1, 2, 3, 4, 6],
            [1, 3, 7],
            [1, 8],
        ])
        expect(body.map((group: { placeholders: Array<{ displayName: string }> }) => group.placeholders.map(p => p.displayName))).toEqual([
            ['Mar'],
            [],
            ['Lucía'],
        ])
        // Tuesday: Ada 1–2, Bea 2–3, Cai 4–6, Dan 7, Fay 8–9; Mar's 9 is Fay's too. Weekend: Ada 1–2, Cai 4–6, Gus 10. Family: Ada 1–2, Hal 11, Lucía 3.
        expect(body.map((group: { gameCount: number }) => group.gameCount)).toEqual([9, 6, 4])
        expect(JSON.stringify(body)).not.toMatch(/"games"|"reviews"|@example\.test/)
    })

    it("answers a group's shelf with its members' ratings only, and each owner's games", async () => {
        const { body } = await queriesFor('/dashboard/users/1/groups/10/shelf', 'user_ada')

        expect(body.games.map((game: { id: number }) => game.id)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9])
        expect(body.owners).toEqual([
            { accountId: 1, groupPersonId: null, gameIds: [1, 2] },
            { accountId: 2, groupPersonId: null, gameIds: [2, 3] },
            { accountId: 3, groupPersonId: null, gameIds: [4, 5, 6] },
            { accountId: 4, groupPersonId: null, gameIds: [7] },
            { accountId: 6, groupPersonId: null, gameIds: [8, 9] },
            { accountId: null, groupPersonId: 42, gameIds: [9] },
        ])
        // Not Ugo's rating of game 2, nor Gus's or Hal's: they are not in Tuesday.
        expect(body.reviews.map((review: { accountId: number; gameId: number }) => [review.accountId, review.gameId])).toEqual([
            [1, 1],
            [2, 2],
            [3, 4],
            [4, 7],
        ])
    })

    it('still answers the previous shape: each member with their own games and ratings', async () => {
        const { body } = await queriesFor('/dashboard/users/1/groups', 'user_ada')
        const member = (groupIndex: number, id: number) => body[groupIndex].members.find((m: { id: number }) => m.id === id)
        const gameIds = (games: Array<{ id: number }>) => games.map(game => game.id)
        const ratings = (reviews: Array<{ gameId: number }>) => reviews.map(review => review.gameId)

        expect(body.map((group: { id: number }) => group.id)).toEqual([10, 11, 12])
        expect(gameIds(member(0, 3).games)).toEqual([4, 5, 6])
        expect(ratings(member(0, 3).reviews)).toEqual([4])
        // Cai is the same person in Weekend, with the same games and ratings.
        expect(member(1, 3)).toEqual({ ...member(0, 3), joinedAt: '2026-02-03 10:00:00' })
        expect(ratings(member(0, 2).reviews)).toEqual([2])
        expect(ratings(member(0, 6).reviews)).toEqual([])
        expect(body[2].placeholders).toEqual([expect.objectContaining({ id: 40, displayName: 'Lucía', gameIds: [3] })])
        expect(gameIds(body[2].placeholders[0].games)).toEqual([3])
        expect(JSON.stringify(body)).not.toContain('@example.test')
    })

    it('still refuses a group the caller is not in, and another user’s address', async () => {
        for (const path of [
            '/dashboard/users/5/group-overviews/10',
            '/dashboard/users/5/groups/10/shelf',
            '/dashboard/users/5/groups/10',
        ]) {
            await request(app.getHttpServer()).get(path).set(as('user_eve')).expect(403)
        }
        for (const path of ['/dashboard/users/1/groups', '/dashboard/users/1/group-overviews', '/dashboard/users/1/stats']) {
            await request(app.getHttpServer()).get(path).set(as('user_eve')).expect(403)
        }
    })
})
