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
const testDatabasePath = resolve(__dirname, 'admin-catalogue.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

describe('admin catalogue (e2e)', () => {
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
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                    (1, 'admin@example.test', 'admin', ${avatar}, 'Admin', 'user_admin', 1, 0),
                    (2, 'player@example.test', 'player', ${avatar}, 'Player', 'user_player', 0, 0);

                -- Azul is complete; Catan has no artwork; Hanabi has no tags, and was approved from a proposal without players or length.
                -- The game without a title has no retail price either.
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers, retailPriceCents) VALUES
                    (1, 'https://example.test/azul.jpg', 45, 2, 4, 3999),
                    (2, '', 90, 3, 4, 4495),
                    (3, 'https://example.test/hanabi.jpg', 60, 2, 4, 1295),
                    (4, 'https://example.test/orphan.jpg', 30, 1, 2, NULL);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES
                    (1, 'en', 'Azul', 'azul'), (1, 'es', 'Azul (edición)', 'azul (edicion)'),
                    (2, 'en', 'Catan', 'catan'), (2, 'es', 'Catan', 'catan'),
                    (3, 'en', 'Hanabi', 'hanabi');
                INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary)
                SELECT gameId, languageCode, title, normalizedTitle,
                       ROW_NUMBER() OVER (PARTITION BY gameId ORDER BY languageCode = 'en' DESC, languageCode) = 1
                FROM GameTranslation ORDER BY gameId, languageCode;
                INSERT INTO GameProposal (submittedBy, status, title, createdGameId, reviewedBy, reviewedAt, submittedAt) VALUES
                    (2, 'approved', 'Hanabi', 3, 1, datetime('now', '-2 days'), datetime('now', '-3 days')),
                    (2, 'rejected', 'Monopoly', NULL, 1, datetime('now', '-40 days'), datetime('now', '-41 days')),
                    (2, 'pending', 'Codenames', NULL, NULL, NULL, '2026-09-01 10:00:00'),
                    (2, 'pending', 'Skull', NULL, NULL, NULL, '2026-09-20 10:00:00');

                -- Azul is owned by two people (one deleted, who does not count); Catan is wanted and owned by nobody.
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                    (3, 'gone@example.test', 'gone', ${avatar}, 'Gone', 'user_gone', 0, 1);
                INSERT INTO OwnedGame (accountId, gameId) VALUES (1, 1), (2, 1), (3, 1), (2, 3);
                INSERT INTO WishlistedGame (accountId, gameId) VALUES (1, 2), (2, 2), (3, 2), (1, 3);

                INSERT INTO TagCategory (id, name) VALUES (1, 'Genre'), (2, 'Players');
                INSERT INTO Tag (id, name, categoryId) VALUES (1, 'Abstract', 1), (2, 'Two-Player', 2), (3, '2 players', 2), (4, 'Strategy', 1);
                INSERT INTO GameTag (gameId, tagId) VALUES (1, 1), (1, 2), (1, 3), (2, 3), (2, 4);
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
        database = createClient({ url: `file:${testDatabasePath}` })
    })

    afterAll(async () => {
        await app?.close()
        database?.close()
        removeTestDatabase(testDatabasePath)
    })

    const asAdmin = { Authorization: `Bearer ${sessionFor('user_admin')}` }
    const asPlayer = { Authorization: `Bearer ${sessionFor('user_player')}` }

    const titlesFor = async (query: Record<string, string | number>) => {
        const response = await request(app.getHttpServer()).get('/admin/games').query(query).set(asAdmin).expect(200)

        return response.body.games.map((game: { title: string }) => game.title)
    }

    it('lists the whole catalogue by title, with each game’s title, tags and data problems', async () => {
        const response = await request(app.getHttpServer()).get('/admin/games').set(asAdmin).expect(200)

        expect(response.body.pagination).toEqual({ currentPage: 1, totalPages: 1, totalItems: 4, itemsPerPage: 10 })
        // A game without any title sorts first, so it is easy to find.
        expect(response.body.games.map((game: { title: string; issues: string[] }) => [game.title, game.issues])).toEqual([
            ['', ['no-title', 'no-tags', 'no-price']],
            ['Azul', []],
            ['Catan', ['no-artwork']],
            ['Hanabi', ['no-tags']],
        ])
        expect(response.body.games[1]).toEqual(
            expect.objectContaining({
                editions: [
                    { id: expect.any(Number), languageCode: 'en', title: 'Azul', isPrimary: true },
                    { id: expect.any(Number), languageCode: 'es', title: 'Azul (edición)', isPrimary: false },
                ],
                tags: [
                    { id: 1, name: 'Abstract', categoryName: 'Genre' },
                    { id: 3, name: '2 players', categoryName: 'Players' },
                    { id: 2, name: 'Two-Player', categoryName: 'Players' },
                ],
            }),
        )
    })

    it('sums up what needs doing and the catalogue for the overview', async () => {
        const response = await request(app.getHttpServer()).get('/admin/overview').set(asAdmin).expect(200)

        expect(response.body).toEqual({
            proposals: { pending: 2, oldestPendingAt: '2026-09-01 10:00:00' },
            catalogueIssues: { 'no-title': 1, 'no-artwork': 1, 'no-primary': 0, 'no-tags': 2, 'no-price': 1 },
            tags: { unused: 0, emptyCategories: 0 },
            catalogue: {
                games: 4,
                approvedLast30Days: 1,
                mostOwned: [
                    { gameId: 1, title: 'Azul', count: 2 },
                    { gameId: 3, title: 'Hanabi', count: 1 },
                ],
                mostWantedUnowned: [{ gameId: 2, title: 'Catan', count: 2 }],
            },
            recentDecisions: [
                expect.objectContaining({ title: 'Hanabi', status: 'approved', reviewerName: 'Admin', createdGameId: 3 }),
                expect.objectContaining({ title: 'Monopoly', status: 'rejected', reviewerName: 'Admin', createdGameId: null }),
            ],
        })
        await request(app.getHttpServer()).get('/admin/overview').set(asPlayer).expect(403)
    })

    it('filters by search, players, length, tags and each data problem', async () => {
        expect(await titlesFor({ search: 'cat' })).toEqual(['Catan'])
        expect(await titlesFor({ search: 'edicion' })).toEqual(['Azul'])
        // `%` and `_` are text, not wildcards; punctuation alone finds nothing.
        expect(await titlesFor({ search: 'c_t' })).toEqual([])
        expect(await titlesFor({ search: '__' })).toEqual([])
        expect(await titlesFor({ search: '%%' })).toEqual([])
        expect(await titlesFor({ players: 3 })).toEqual(['Azul', 'Catan', 'Hanabi'])
        expect(await titlesFor({ issue: 'no-title' })).toEqual([''])
        expect(await titlesFor({ players: 5 })).toEqual([])
        expect(await titlesFor({ length: 'long' })).toEqual(['Catan'])
        expect(await titlesFor({ tags: '3,4' })).toEqual(['Catan'])
        expect(await titlesFor({ issue: 'no-artwork' })).toEqual(['Catan'])
        expect(await titlesFor({ issue: 'no-primary' })).toEqual([])
        expect(await titlesFor({ issue: 'no-tags' })).toEqual(['', 'Hanabi'])
        expect(await titlesFor({ issue: 'no-price' })).toEqual([''])
        await request(app.getHttpServer()).get('/admin/games').query({ issue: 'nonsense' }).set(asAdmin).expect(400)
    })

    it('suggests games that share tags as similar, and none for a game without tags', async () => {
        const similarTo = async (gameId: number) => {
            const response = await request(app.getHttpServer()).get(`/collection/users/2/games/${gameId}`).set(asPlayer).expect(200)

            return response.body.similarGames.map((game: { id: number }) => game.id)
        }

        expect(await similarTo(1)).toEqual([2])
        expect(await similarTo(2)).toEqual([1])
        expect(await similarTo(3)).toEqual([])
    })

    it('keeps the catalogue admin-only', async () => {
        await request(app.getHttpServer()).get('/admin/games').set(asPlayer).expect(403)
        await request(app.getHttpServer()).patch('/admin/games/1').set(asPlayer).send({ minPlayers: 1 }).expect(403)
        await request(app.getHttpServer()).post('/admin/tags/2/merge').set(asPlayer).send({ intoTagId: 3 }).expect(403)
    })

    it('saves editions, artwork, players, length and tags together', async () => {
        const response = await request(app.getHttpServer())
            .patch('/admin/games/3')
            .set(asAdmin)
            .send({
                editions: [
                    { languageCode: 'en', title: 'Hanabi', isPrimary: true },
                    { languageCode: 'ES', title: 'Hanabi (ES)', isPrimary: false },
                ],
                imageUrl: '',
                minPlayers: 2,
                maxPlayers: 5,
                gameAvgDuration: 25,
                tagIds: [4, 4, 1],
            })
            .expect(200)

        expect(response.body).toEqual(
            expect.objectContaining({
                id: 3,
                title: 'Hanabi',
                imageUrl: '',
                minPlayers: 2,
                maxPlayers: 5,
                gameAvgDuration: 25,
                editions: [
                    { id: expect.any(Number), languageCode: 'en', title: 'Hanabi', isPrimary: true },
                    { id: expect.any(Number), languageCode: 'es', title: 'Hanabi (ES)', isPrimary: false },
                ],
                issues: ['no-artwork'],
            }),
        )
        expect(response.body.tags.map((tag: { id: number }) => tag.id)).toEqual([1, 4])
    })

    it('gives a game a German edition, makes it primary, and keeps the other edition ids', async () => {
        const before = await request(app.getHttpServer()).get('/admin/games/1').set(asAdmin).expect(200)
        const english = before.body.editions.find((edition: { languageCode: string }) => edition.languageCode === 'en')

        const response = await request(app.getHttpServer())
            .patch('/admin/games/1')
            .set(asAdmin)
            .send({
                editions: [
                    { languageCode: 'en', title: 'Azul', isPrimary: false },
                    { languageCode: 'de', title: 'Azul (Deutsch)', isPrimary: true },
                    { languageCode: 'es', title: 'Azul (edición)', isPrimary: false },
                ],
            })
            .expect(200)

        // The primary edition is first, then by language code; the English edition keeps its id.
        expect(response.body.title).toBe('Azul (Deutsch)')
        expect(response.body.editions).toEqual([
            { id: expect.any(Number), languageCode: 'de', title: 'Azul (Deutsch)', isPrimary: true },
            { id: english.id, languageCode: 'en', title: 'Azul', isPrimary: false },
            { id: expect.any(Number), languageCode: 'es', title: 'Azul (edición)', isPrimary: false },
        ])
        // The legacy translations follow, and Browse's search finds the new title.
        const translations = await database.execute(
            'SELECT languageCode, title FROM GameTranslation WHERE gameId = 1 ORDER BY languageCode',
        )

        expect(translations.rows.map(row => [row.languageCode, row.title])).toEqual([
            ['de', 'Azul (Deutsch)'],
            ['en', 'Azul'],
            ['es', 'Azul (edición)'],
        ])
        expect(await titlesFor({ search: 'deutsch' })).toEqual(['Azul (Deutsch)'])
    })

    it('removes the editions left out, and leaves unsent fields alone', async () => {
        await request(app.getHttpServer())
            .patch('/admin/games/1')
            .set(asAdmin)
            .send({ editions: [{ languageCode: 'de', title: 'Azul (Deutsch)', isPrimary: true }] })
            .expect(200)

        const game = await request(app.getHttpServer()).get('/admin/games/1').set(asAdmin).expect(200)

        expect(game.body.editions).toEqual([{ id: expect.any(Number), languageCode: 'de', title: 'Azul (Deutsch)', isPrimary: true }])
        expect(game.body).toEqual(expect.objectContaining({ minPlayers: 2, maxPlayers: 4 }))
        expect(game.body.tags).toHaveLength(3)
        const translations = await database.execute('SELECT languageCode FROM GameTranslation WHERE gameId = 1')

        expect(translations.rows.map(row => row.languageCode)).toEqual(['de'])
    })

    it('finds games whose editions have no primary one', async () => {
        await database.execute("INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (5, '', 30, 2, 2)")
        await database.execute(
            "INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle) VALUES (5, 'fr', 'Sans primaire', 'sans primaire')",
        )

        try {
            expect(await titlesFor({ issue: 'no-primary' })).toEqual([''])
            expect(await titlesFor({ issue: 'no-title' })).toEqual([''])
            const game = await request(app.getHttpServer()).get('/admin/games/5').set(asAdmin).expect(200)

            expect(game.body.issues).toContain('no-primary')
            expect(game.body.editions).toEqual([{ id: expect.any(Number), languageCode: 'fr', title: 'Sans primaire', isPrimary: false }])
            // Saving a primary edition repairs it.
            await request(app.getHttpServer())
                .patch('/admin/games/5')
                .set(asAdmin)
                .send({ editions: [{ languageCode: 'fr', title: 'Sans primaire', isPrimary: true }] })
                .expect(200)
            expect(await titlesFor({ issue: 'no-primary' })).toEqual([])
        } finally {
            await database.execute('DELETE FROM Game WHERE id = 5')
        }
    })

    it('rejects invalid changes and saves none of them', async () => {
        const edition = { languageCode: 'en', title: 'Catan', isPrimary: true }
        const invalid = [
            { minPlayers: 5 }, // more than Catan's 4
            { tagIds: [1, 999] },
            { editions: [] },
            { editions: [{ ...edition, isPrimary: false }] }, // no primary
            { editions: [edition, { languageCode: 'es', title: 'Catan', isPrimary: true }] }, // two primaries
            { editions: [edition, { languageCode: 'EN', title: 'Catan 2', isPrimary: false }] }, // one language twice
            { editions: [{ ...edition, title: '  ' }] },
            { editions: [{ ...edition, languageCode: 'english' }] },
            { translations: { en: 'Catan' } },
            { gameAvgDuration: 0 },
            { imageUrl: 'x'.repeat(2049) },
        ]

        for (const body of invalid) {
            await request(app.getHttpServer()).patch('/admin/games/2').set(asAdmin).send(body).expect(400)
        }
        await request(app.getHttpServer()).patch('/admin/games/999').set(asAdmin).send({ minPlayers: 1 }).expect(404)

        const catan = await request(app.getHttpServer()).get('/admin/games/2').set(asAdmin).expect(200)

        expect(catan.body).toEqual(expect.objectContaining({ minPlayers: 3, maxPlayers: 4 }))
        expect(catan.body.editions.map((entry: { languageCode: string }) => entry.languageCode)).toEqual(['en', 'es'])
    })

    it('merges a tag into another in one step, keeping each game once', async () => {
        const merged = await request(app.getHttpServer()).post('/admin/tags/2/merge').set(asAdmin).send({ intoTagId: 3 }).expect(200)

        // Azul already had both tags, so no game gained "2 players".
        expect(merged.body).toEqual({ gamesMoved: 0 })
        const tag = await database.execute('SELECT COUNT(*) AS count FROM Tag WHERE id = 2')
        const azulTags = await database.execute('SELECT tagId FROM GameTag WHERE gameId = 1 ORDER BY tagId')

        expect(Number(tag.rows[0]?.count)).toBe(0)
        expect(azulTags.rows.map(row => Number(row.tagId))).toEqual([1, 3])

        const moved = await request(app.getHttpServer()).post('/admin/tags/4/merge').set(asAdmin).send({ intoTagId: 1 }).expect(200)

        expect(moved.body).toEqual({ gamesMoved: 1 })

        await request(app.getHttpServer()).post('/admin/tags/1/merge').set(asAdmin).send({ intoTagId: 1 }).expect(400)
        await request(app.getHttpServer()).post('/admin/tags/999/merge').set(asAdmin).send({ intoTagId: 1 }).expect(404)
    })
})
