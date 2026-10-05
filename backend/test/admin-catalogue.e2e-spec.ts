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

                -- Azul is complete; Catan has no artwork and the same Spanish title; Hanabi has no Spanish
                -- title and no tags, and was approved from a proposal without players or length.
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                    (1, 'https://example.test/azul.jpg', 45, 2, 4),
                    (2, '', 90, 3, 4),
                    (3, 'https://example.test/hanabi.jpg', 60, 2, 4),
                    (4, 'https://example.test/orphan.jpg', 30, 1, 2);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES
                    (1, 'en', 'Azul', 'azul'), (1, 'es', 'Azul (edición)', 'azul (edicion)'),
                    (2, 'en', 'Catan', 'catan'), (2, 'es', 'Catan', 'catan'),
                    (3, 'en', 'Hanabi', 'hanabi');
                INSERT INTO GameProposal (submittedBy, status, title, createdGameId) VALUES (2, 'approved', 'Hanabi', 3);

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
            ['', ['no-title', 'no-spanish', 'no-tags']],
            ['Azul', []],
            ['Catan', ['no-artwork', 'no-spanish']],
            ['Hanabi', ['no-spanish', 'no-tags', 'guessed-values']],
        ])
        expect(response.body.games[1]).toEqual(
            expect.objectContaining({
                translations: { en: 'Azul', es: 'Azul (edición)' },
                tags: [
                    { id: 1, name: 'Abstract', categoryName: 'Genre' },
                    { id: 3, name: '2 players', categoryName: 'Players' },
                    { id: 2, name: 'Two-Player', categoryName: 'Players' },
                ],
            }),
        )
    })

    it('filters by search, players, length, tags and each data problem', async () => {
        expect(await titlesFor({ search: 'cat' })).toEqual(['Catan'])
        expect(await titlesFor({ search: 'edicion' })).toEqual(['Azul'])
        expect(await titlesFor({ players: 3 })).toEqual(['Azul', 'Catan', 'Hanabi'])
        expect(await titlesFor({ issue: 'no-title' })).toEqual([''])
        expect(await titlesFor({ players: 5 })).toEqual([])
        expect(await titlesFor({ length: 'long' })).toEqual(['Catan'])
        expect(await titlesFor({ tags: '3,4' })).toEqual(['Catan'])
        expect(await titlesFor({ issue: 'no-artwork' })).toEqual(['Catan'])
        expect(await titlesFor({ issue: 'no-spanish' })).toEqual(['', 'Catan', 'Hanabi'])
        expect(await titlesFor({ issue: 'no-tags' })).toEqual(['', 'Hanabi'])
        expect(await titlesFor({ issue: 'guessed-values' })).toEqual(['Hanabi'])
        await request(app.getHttpServer()).get('/admin/games').query({ issue: 'nonsense' }).set(asAdmin).expect(400)
    })

    it('keeps the catalogue admin-only', async () => {
        await request(app.getHttpServer()).get('/admin/games').set(asPlayer).expect(403)
        await request(app.getHttpServer()).patch('/admin/games/1').set(asPlayer).send({ minPlayers: 1 }).expect(403)
        await request(app.getHttpServer()).post('/admin/tags/2/merge').set(asPlayer).send({ intoTagId: 3 }).expect(403)
    })

    it('saves titles, artwork, players, length and tags together', async () => {
        const response = await request(app.getHttpServer())
            .patch('/admin/games/3')
            .set(asAdmin)
            .send({
                translations: { en: 'Hanabi', es: 'Hanabi (ES)' },
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
                translations: { en: 'Hanabi', es: 'Hanabi (ES)' },
                // Two players is still the value old approvals guessed, so it stays listed for a check.
                issues: ['no-artwork', 'guessed-values'],
            }),
        )
        expect(response.body.tags.map((tag: { id: number }) => tag.id)).toEqual([1, 4])
    })

    it('removes the Spanish title when it is sent empty, and leaves unsent fields alone', async () => {
        await request(app.getHttpServer())
            .patch('/admin/games/1')
            .set(asAdmin)
            .send({ translations: { es: '' } })
            .expect(200)

        const game = await request(app.getHttpServer()).get('/admin/games/1').set(asAdmin).expect(200)

        expect(game.body).toEqual(expect.objectContaining({ translations: { en: 'Azul', es: '' }, minPlayers: 2, maxPlayers: 4 }))
        expect(game.body.tags).toHaveLength(3)
    })

    it('rejects invalid changes and saves none of them', async () => {
        const invalid = [
            { minPlayers: 5 }, // more than Catan's 4
            { tagIds: [1, 999] },
            { translations: { en: '  ' } },
            { translations: { fr: 'Catane' } },
            { gameAvgDuration: 0 },
            { imageUrl: 'x'.repeat(2049) },
        ]

        for (const body of invalid) {
            await request(app.getHttpServer()).patch('/admin/games/2').set(asAdmin).send(body).expect(400)
        }
        await request(app.getHttpServer()).patch('/admin/games/999').set(asAdmin).send({ minPlayers: 1 }).expect(404)

        const catan = await request(app.getHttpServer()).get('/admin/games/2').set(asAdmin).expect(200)

        expect(catan.body).toEqual(expect.objectContaining({ minPlayers: 3, maxPlayers: 4, translations: { en: 'Catan', es: 'Catan' } }))
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
