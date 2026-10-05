import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'

import { AppModule } from './../src/app.module'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier'
import { removeTestDatabase } from './remove-test-database'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'browse-catalogue.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

describe('browsing the catalogue with filters (e2e)', () => {
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
        execFileSync('sqlite3', [testDatabasePath], {
            input: `
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted)
                VALUES (1, 'player@example.test', 'player', ${avatar}, 'Player', 'user_player', 0, 0);

                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                    (1, 'https://example.test/azul.jpg', 45, 2, 4),
                    (2, 'https://example.test/catan.jpg', 90, 3, 4),
                    (3, 'https://example.test/love-letter.jpg', 20, 2, 6),
                    (4, 'https://example.test/twilight.jpg', 240, 3, 6),
                    (5, 'https://example.test/codenames.jpg', 15, 2, 8);
                INSERT INTO GameTranslation (gameId, languageCode, title, normalizedTitle) VALUES
                    (1, 'en', 'Azul', 'azul'), (1, 'es', 'Azul', 'azul'),
                    (2, 'en', 'Catan', 'catan'), (2, 'es', 'Los colonos de Catán', 'los-colonos-de-catan'),
                    (3, 'en', 'Love Letter', 'love-letter'), (3, 'es', 'Love Letter', 'love-letter'),
                    (4, 'en', 'Twilight Imperium', 'twilight-imperium'), (4, 'es', 'Twilight Imperium', 'twilight-imperium'),
                    (5, 'en', 'Codenames', 'codenames'), (5, 'es', 'Código Secreto', 'codigo-secreto');

                INSERT INTO TagCategory (id, name) VALUES (1, 'Genre'), (2, 'Mechanic');
                INSERT INTO Tag (id, name, categoryId) VALUES (1, 'Abstract', 1), (2, 'Strategy', 1), (3, 'Trading', 2), (4, 'Unused', 2);
                INSERT INTO GameTag (gameId, tagId) VALUES (1, 1), (2, 2), (2, 3), (4, 2);

                INSERT INTO OwnedGame (accountId, gameId) VALUES (1, 2);
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

    const asPlayer = { Authorization: `Bearer ${sessionFor('user_player')}` }

    async function browse(query: string): Promise<{ titles: Array<string>; totalItems: number; totalPages: number }> {
        const response = await request(app.getHttpServer()).get(`/collection/users/1/browse/games?${query}`).set(asPlayer).expect(200)

        return {
            titles: response.body.games.map((game: { titleTranslations: { en: string } }) => game.titleTranslations.en),
            totalItems: response.body.pagination.totalItems,
            totalPages: response.body.pagination.totalPages,
        }
    }

    it('lists the whole catalogue by title', async () => {
        expect(await browse('')).toEqual({
            titles: ['Azul', 'Catan', 'Codenames', 'Love Letter', 'Twilight Imperium'],
            totalItems: 5,
            totalPages: 1,
        })
    })

    it('pages through the filtered order', async () => {
        expect(await browse('limit=2&page=2')).toEqual({ titles: ['Codenames', 'Love Letter'], totalItems: 5, totalPages: 3 })
    })

    it('finds a game by any of its titles', async () => {
        expect((await browse('search=colonos')).titles).toEqual(['Catan'])
        expect((await browse('search=c%C3%B3digo')).titles).toEqual(['Codenames'])
    })

    it('keeps the games that play with the given number of people', async () => {
        expect((await browse('players=5')).titles).toEqual(['Codenames', 'Love Letter', 'Twilight Imperium'])
    })

    it('splits games by average length without overlaps', async () => {
        expect((await browse('length=short')).titles).toEqual(['Codenames', 'Love Letter'])
        expect((await browse('length=medium')).titles).toEqual(['Azul'])
        expect((await browse('length=long')).titles).toEqual(['Catan'])
        expect((await browse('length=epic')).titles).toEqual(['Twilight Imperium'])
    })

    it('keeps the games that have every chosen tag', async () => {
        expect((await browse('tags=2')).titles).toEqual(['Catan', 'Twilight Imperium'])
        expect((await browse('tags=2,3')).titles).toEqual(['Catan'])
    })

    it('hides the games the user owns', async () => {
        expect(await browse('hideOwned=true')).toEqual({
            titles: ['Azul', 'Codenames', 'Love Letter', 'Twilight Imperium'],
            totalItems: 4,
            totalPages: 1,
        })
    })

    it('combines filters and sorts', async () => {
        expect((await browse('sort=shortest')).titles).toEqual(['Codenames', 'Love Letter', 'Azul', 'Catan', 'Twilight Imperium'])
        expect((await browse('sort=newest')).titles).toEqual(['Codenames', 'Twilight Imperium', 'Love Letter', 'Catan', 'Azul'])
        expect((await browse('players=3&tags=2&hideOwned=true')).titles).toEqual(['Twilight Imperium'])
    })

    it('rejects unknown filter values', async () => {
        for (const query of ['length=forever', 'tags=abc', 'players=0', 'sort=random']) {
            await request(app.getHttpServer()).get(`/collection/users/1/browse/games?${query}`).set(asPlayer).expect(400)
        }
    })

    it('lists only the tags some game has, with counts', async () => {
        const response = await request(app.getHttpServer()).get('/collection/tags').set(asPlayer).expect(200)

        expect(response.body).toEqual([
            { id: 1, name: 'Abstract', categoryName: 'Genre', gameCount: 1 },
            { id: 2, name: 'Strategy', categoryName: 'Genre', gameCount: 2 },
            { id: 3, name: 'Trading', categoryName: 'Mechanic', gameCount: 1 },
        ])
    })
})
