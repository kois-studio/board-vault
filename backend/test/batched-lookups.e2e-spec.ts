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
const testDatabasePath = resolve(__dirname, 'batched-lookups.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const many = [2, 3, 4, 5, 6, 7]
const rows = (ids: Array<number>, row: (id: number) => string) => ids.map(row).join(', ')

// #251: a list costs the same number of queries whether it holds one game (person, invitation) or six.
// Bea (2) has one of everything; Cai (3) has six. Game 1 has one similar game and one review, game 8 has six of each.
// Fridays (10) has one placeholder, Saturdays (11) has six.
describe('batched lookups (e2e)', () => {
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
        const games = [1, ...many, 8, 9, 10, 11, 12, 13, 14]
        const senders = [20, 21, 22, 23, 24, 25]

        sql(`
            INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                (1, 'ada@example.test', 'adaplays', ${avatar}, 'Ada', 'user_ada', 0, 0),
                (2, 'bea@example.test', 'beaplays', ${avatar}, 'Bea', 'user_bea', 0, 0),
                (3, 'cai@example.test', 'caiplays', ${avatar}, 'Cai', 'user_cai', 0, 0),
                ${rows(senders, id => `(${id}, 's${id}@example.test', 'sender${id}', ${avatar}, 'Sender ${id}', 'user_s${id}', 0, 0)`)};
            INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                ${rows(games, id => `(${id}, 'https://example.test/${id}.jpg', 45, 2, 4)`)};
            INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES
                ${rows(games, id => `(${id}, 'en', 'Game ${id}', 'game-${id}', 1)`)};

            INSERT INTO OwnedGame (accountId, gameId) VALUES (2, 2), ${rows(many, id => `(3, ${id})`)};
            INSERT INTO WishlistedGame (accountId, gameId) VALUES (2, 9), ${rows(many, id => `(3, ${id + 7})`)};
            INSERT INTO GameReview (accountId, gameId, review) VALUES (2, 2, 7), ${rows(many, id => `(3, ${id}, 8)`)};
            INSERT INTO CollectionActivity (accountId, gameId, actionType) VALUES (2, 2, 'added'), ${rows(many, id => `(3, ${id}, 'added')`)};

            INSERT INTO TagCategory (id, name) VALUES (1, 'Mechanics');
            INSERT INTO Tag (id, name, categoryId) VALUES (1, 'Drafting', 1), (2, 'Racing', 1);
            INSERT INTO GameTag (gameId, tagId) VALUES (1, 1), (9, 1), (8, 2), ${rows(many, id => `(${id + 7}, 2)`)};
            INSERT INTO GameReview (accountId, gameId, review) VALUES (20, 1, 6), ${rows(senders, id => `(${id}, 8, 9)`)};

            INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Fridays', 1), (11, 'Saturdays', 1),
                ${rows(senders, id => `(${id + 10}, 'Group ${id}', ${id})`)};
            INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (1, 11), (2, 10), (3, 11), ${rows(senders, id => `(${id}, ${id + 10})`)};
            INSERT INTO GroupPerson (id, groupId, kind, displayName, createdByAccountId) VALUES
                (100, 10, 'placeholder', 'Ana', 1), ${rows(many, id => `(${id + 100}, 11, 'placeholder', 'Guest ${id}', 1)`)};
            -- Bea and Cai are linked people whose shelves count as what they own; 121 is archived.
            INSERT INTO GroupPerson (id, groupId, accountId, kind, status, displayName, createdByAccountId) VALUES
                (130, 10, 2, 'linked', 'active', 'Bea', 2), (120, 11, 3, 'linked', 'active', 'Cai', 3),
                (121, 11, NULL, 'placeholder', 'archived', 'Gone', 1);
            UPDATE OwnedGame SET editionId = (SELECT id FROM GameEdition WHERE gameId = 3) WHERE accountId = 3 AND gameId = 3;
            INSERT INTO GroupPersonGameOwnership (groupPersonId, gameId, status, enteredByAccountId) VALUES
                (100, 1, 'asserted', 1), ${rows(many, id => `(${id + 100}, ${id}, 'asserted', 1)`)},
                (120, 2, 'rejected', 1), (121, 1, 'asserted', 1);
            INSERT INTO GroupPersonGamePreference (groupPersonId, gameId, preference, enteredByAccountId) VALUES
                (100, 1, 'like', 1), ${rows(many, id => `(${id + 100}, ${id}, 'favorite', 1)`)};

            INSERT INTO Invitation (groupId, fromAccountId, toAccountId, expiresAt) VALUES
                (30, 20, 2, datetime('now', '+7 days')), ${rows(senders, id => `(${id + 10}, ${id}, 3, datetime('now', '+7 days'))`)};
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

    /** The queries one request issued, and its body. */
    async function queriesFor(path: string, clerkUserId: string) {
        // Compare endpoint queries with account resolution warm on both requests (#250).
        await request(app.getHttpServer())
            .get('/auth/clerk/status')
            .set({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
            .expect(200)
        execute.mockClear()
        const response = await request(app.getHttpServer())
            .get(path)
            .set({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
            .expect(200)

        return { queries: execute.mock.calls.length, body: response.body }
    }

    it.each([
        ['owned games', '/collection/users/2/games', '/collection/users/3/games'],
        ['reviews', '/collection/users/2/reviews', '/collection/users/3/reviews'],
        ['wishlist', '/collection/users/2/wishlist', '/collection/users/3/wishlist'],
        ['recent activity', '/collection/users/2/recent-activity', '/collection/users/3/recent-activity'],
        ['invitations', '/profile/users/2/invitations', '/profile/users/3/invitations'],
    ])('reads %s in the same number of queries for one row or six', async (_name, one, six) => {
        const few = await queriesFor(one, 'user_bea')
        const lots = await queriesFor(six, 'user_cai')

        expect(few.body).toHaveLength(1)
        expect(lots.body).toHaveLength(6)
        expect(lots.queries).toBe(few.queries)
    })

    it('reads a game with several similar games and reviews in as many queries as one with one', async () => {
        const few = await queriesFor('/collection/users/2/games/1', 'user_bea')
        const lots = await queriesFor('/collection/users/2/games/8', 'user_bea')

        expect(few.body.similarGames).toHaveLength(1)
        // Six share a tag with game 8; the view shows the first four, in order (most shared tags, then id), with titles.
        expect(lots.body.similarGames.map((game: { id: number; title: string }) => [game.id, game.title])).toEqual([
            [9, 'Game 9'],
            [10, 'Game 10'],
            [11, 'Game 11'],
            [12, 'Game 12'],
        ])
        expect(lots.queries).toBe(few.queries)
    })

    it('reads a group workspace of six people in as many queries as one of one person', async () => {
        const few = await queriesFor('/groups/10/people', 'user_ada')
        const lots = await queriesFor('/groups/11/people', 'user_ada')

        expect(few.body.people).toHaveLength(2)
        // Six guests and Cai; the archived person stays out.
        expect(lots.body.people).toHaveLength(7)
        expect(lots.queries).toBe(few.queries)

        // Each person gets their own rows, not a neighbour's, nor those of someone in another group.
        const group11 = personIn(lots.body.people)

        for (const id of many) {
            const guest = group11(id + 100)

            expect(guest.ownership.map(row => row.gameId)).toEqual([id])
            expect(guest.preferences).toEqual([expect.objectContaining({ gameId: id, preference: 'favorite' })])
        }
        // Cai's shelf counts, except where the group already recorded something else for that game.
        expect(group11(120).ownership.map(row => [row.gameId, row.status, row.source, row.copyTitle])).toEqual([
            [2, 'rejected', 'placeholder_setup', null],
            [3, 'asserted', 'account_collection', 'Game 3'],
            [4, 'asserted', 'account_collection', null],
            [5, 'asserted', 'account_collection', null],
            [6, 'asserted', 'account_collection', null],
            [7, 'asserted', 'account_collection', null],
        ])
        expect(personIn(few.body.people)(130).ownership.map(row => [row.gameId, row.source])).toEqual([[2, 'account_collection']])

        const withArchived = await queriesFor('/groups/11/people?includeArchived=true', 'user_ada')

        expect(personIn(withArchived.body.people)(121).ownership.map(row => row.gameId)).toEqual([1])
    })
})

type WorkspaceEntry = {
    person: { id: number }
    ownership: Array<{ gameId: number; status: string; source: string; copyTitle: string | null }>
    preferences: Array<{ gameId: number; preference: string }>
}

/** Looks a person up in a workspace response by id, failing loudly when they are missing. */
function personIn(people: Array<WorkspaceEntry>) {
    const byId = new Map(people.map(entry => [entry.person.id, entry]))

    return (id: number): WorkspaceEntry => {
        const entry = byId.get(id)

        if (!entry) throw new Error(`person ${id} is not in the workspace`)
        return entry
    }
}
