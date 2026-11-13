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
const testDatabasePath = resolve(__dirname, 'group-overviews.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const six = [1, 2, 3, 4, 5, 6]
const rows = (ids: Array<number>, row: (id: number) => string) => ids.map(row).join(', ')

// #262: Home reads each group's people and counts, the same size however many games anyone owns, and a page about
// a group reads its shelf. Group A has Ada and Bea, who owns one game; group B has Ada and Cai, who owns six, and
// Lucía, a person without an account who brings one of them. Eve is alone in group C. Ugo is in none of them.
describe('group overviews and shelves (e2e)', () => {
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
        sql(`
            INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                (1, 'ada@example.test', 'adaplays', ${avatar}, 'Ada', 'user_ada', 0, 0),
                (2, 'bea@example.test', 'beaplays', ${avatar}, 'Bea', 'user_bea', 0, 0),
                (3, 'cai@example.test', 'caiplays', ${avatar}, 'Cai', 'user_cai', 0, 0),
                (5, 'eve@example.test', 'eveplays', ${avatar}, 'Eve', 'user_eve', 0, 0),
                (6, 'ugo@example.test', 'ugoplays', ${avatar}, 'Ugo', 'user_ugo', 0, 0);
            INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                ${rows(six, id => `(${id}, 'https://example.test/${id}.jpg', 45, 2, 4)`)};
            INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES
                ${rows(six, id => `(${id}, 'en', 'Game ${id}', 'game-${id}', 1)`)};

            INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Group A', 1), (11, 'Group B', 1), (12, 'Group C', 5);
            INSERT INTO GroupMembership (accountId, groupId, joinedAt) VALUES
                (1, 10, '2026-01-01 10:00:00'), (2, 10, '2026-01-02 10:00:00'),
                (1, 11, '2026-01-01 10:00:00'), (3, 11, '2026-01-02 10:00:00'),
                (5, 12, '2026-01-03 10:00:00');
            INSERT INTO OwnedGame (accountId, gameId) VALUES (2, 1), ${rows(six, id => `(3, ${id})`)};
            INSERT INTO GameReview (accountId, gameId, review) VALUES (2, 1, 7), (3, 2, 9), (6, 2, 3);
            INSERT INTO GroupPerson (id, groupId, kind, status, displayName, createdByAccountId) VALUES
                (40, 11, 'placeholder', 'active', 'Lucía', 1), (41, 11, 'placeholder', 'archived', 'Gone', 1);
            INSERT INTO GroupPersonGameOwnership (groupPersonId, gameId, status, enteredByAccountId) VALUES
                (40, 3, 'asserted', 1), (41, 4, 'asserted', 1);
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

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

    /** The queries one request issued, and its body, with account resolution already warm (#250). */
    async function queriesFor(path: string, clerkUserId: string) {
        await request(app.getHttpServer()).get('/auth/clerk/status').set(as(clerkUserId)).expect(200)
        execute.mockClear()
        const response = await request(app.getHttpServer()).get(path).set(as(clerkUserId)).expect(200)

        return { queries: execute.mock.calls.length, body: response.body }
    }

    it('answers each group with its people and counts, never their games or ratings', async () => {
        const { body } = await queriesFor('/dashboard/users/1/group-overviews', 'user_ada')

        expect(body).toEqual([
            expect.objectContaining({
                id: 10,
                name: 'Group A',
                gameCount: 1,
                members: [
                    expect.objectContaining({ id: 1, displayName: 'Ada', joinedAt: '2026-01-01 10:00:00', gameCount: 0 }),
                    expect.objectContaining({ id: 2, displayName: 'Bea', joinedAt: '2026-01-02 10:00:00', gameCount: 1 }),
                ],
                placeholders: [],
            }),
            expect.objectContaining({
                id: 11,
                name: 'Group B',
                // Lucía's game is one of Cai's, so the group still has six.
                gameCount: 6,
                members: [expect.objectContaining({ id: 1, gameCount: 0 }), expect.objectContaining({ id: 3, gameCount: 6 })],
                placeholders: [{ id: 40, displayName: 'Lucía', avatar: null, gameCount: 1 }],
            }),
        ])
        expect(JSON.stringify(body)).not.toMatch(/"games"|"reviews"|"gameIds"|@example\.test/)
    })

    it('is the same size whether a member owns one game or six', async () => {
        const { body } = await queriesFor('/dashboard/users/1/group-overviews', 'user_ada')
        // Same shape and same length of names; only the games owned differ (1 against 6).
        const [a, b] = body.map((group: { placeholders: unknown }) => JSON.stringify({ ...group, placeholders: [] }))

        expect(a.length).toBe(b.length)
    })

    it('reads one group or several in the same number of queries', async () => {
        const one = await queriesFor('/dashboard/users/5/group-overviews', 'user_eve')
        const two = await queriesFor('/dashboard/users/1/group-overviews', 'user_ada')

        expect(one.body).toHaveLength(1)
        expect(two.body).toHaveLength(2)
        expect(two.queries).toBe(one.queries)
    })

    it('answers one group as in the list of overviews', async () => {
        const one = (await request(app.getHttpServer()).get('/dashboard/users/1/group-overviews/11').set(as('user_ada')).expect(200)).body
        const all = (await request(app.getHttpServer()).get('/dashboard/users/1/group-overviews').set(as('user_ada')).expect(200)).body

        expect(one).toEqual(all[1])
    })

    it("answers a group's shelf: each game once, who owns it, and the members' ratings", async () => {
        const { body } = await queriesFor('/dashboard/users/1/groups/11/shelf', 'user_ada')

        expect(body.games.map((game: { id: number; title: string }) => game.title)).toEqual(six.map(id => `Game ${id}`))
        expect(body.owners).toEqual([
            { accountId: 1, groupPersonId: null, gameIds: [] },
            { accountId: 3, groupPersonId: null, gameIds: six },
            // The archived person is left out.
            { accountId: null, groupPersonId: 40, gameIds: [3] },
        ])
        // Cai's rating, not Ugo's: Ugo is not in the group.
        expect(
            body.reviews.map((review: { accountId: number; gameId: number; review: number }) => [
                review.accountId,
                review.gameId,
                review.review,
            ]),
        ).toEqual([[3, 2, 9]])
        expect(JSON.stringify(body)).not.toContain('@example.test')
    })

    it('reads a shelf with one game or six in the same number of queries', async () => {
        const few = await queriesFor('/dashboard/users/1/groups/10/shelf', 'user_ada')
        const lots = await queriesFor('/dashboard/users/1/groups/11/shelf', 'user_ada')

        expect(few.body.games).toHaveLength(1)
        expect(lots.body.games).toHaveLength(6)
        expect(lots.queries).toBe(few.queries)
    })

    it('still answers the previous shape for the previous frontend release, with the same groups', async () => {
        const full = (await request(app.getHttpServer()).get('/dashboard/users/1/groups').set(as('user_ada')).expect(200)).body
        const cai = full[1].members.find((member: { id: number }) => member.id === 3)

        expect(full.map((group: { id: number }) => group.id)).toEqual([10, 11])
        expect(cai.games).toHaveLength(6)
        expect(cai.reviews.map((review: { gameId: number }) => review.gameId)).toEqual([2])
        expect(full[1].placeholders[0]).toEqual(expect.objectContaining({ id: 40, gameIds: [3] }))
    })

    it('refuses a group the caller is not in, another user’s address, and no session', async () => {
        for (const path of ['/dashboard/users/6/group-overviews/11', '/dashboard/users/6/groups/11/shelf']) {
            await request(app.getHttpServer()).get(path).set(as('user_ugo')).expect(403)
        }
        for (const path of [
            '/dashboard/users/1/group-overviews',
            '/dashboard/users/1/group-overviews/11',
            '/dashboard/users/1/groups/11/shelf',
        ]) {
            await request(app.getHttpServer()).get(path).set(as('user_bea')).expect(403)
            await request(app.getHttpServer()).get(path).expect(401)
        }
    })
})
