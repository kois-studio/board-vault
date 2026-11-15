import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { cacheKeys } from './../src/modules/common/cache/cache-keys.js'
import { CacheService } from './../src/modules/common/cache/cache.service.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'tag-merge-cache.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

/** Keeps what is set until it is deleted, as Redis does within a TTL. Rate limits stay off, as without Redis. */
class MemoryCache {
    readonly entries = new Map<string, unknown>()

    isEnabled = () => true
    checkHealth = async () => 'up' as const
    get = async (key: string) => structuredClone(this.entries.get(key) ?? null)
    set = async (key: string, data: unknown) => void this.entries.set(key, structuredClone(data))
    deleteOne = async (key: string) => this.entries.delete(key)
    deleteCachedData = async () => (this.entries.clear(), true)
    deleteAll = async () => (this.entries.clear(), true)
    keys = async () => ({ keys: [...this.entries.keys()] })
    increment = async () => null
}

/**
 * #300: a game page read just before an admin merges or deletes one of its tags must show the
 * change on the next read, with the cache on. The game itself is cached for an hour; its tags
 * never are, so there is nothing a tag change has to clear. The cases run in order on one database:
 * each starts where the one before it left the tags.
 */
describe('game tags with the cache on (e2e)', () => {
    let app: INestApplication
    const cache = new MemoryCache()
    const asPlayer = { Authorization: `Bearer ${sessionFor('user_player')}` }
    const asAdmin = { Authorization: `Bearer ${sessionFor('user_admin')}` }

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

                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                    (1, 'https://example.test/azul.jpg', 45, 2, 4),
                    (2, 'https://example.test/catan.jpg', 90, 3, 4);
                INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES
                    (1, 'en', 'Azul', 'azul', 1),
                    (2, 'en', 'Catan', 'catan', 1);

                -- "Two-Player" is the duplicate an admin merges into "2 players".
                INSERT INTO TagCategory (id, name) VALUES (1, 'Genre'), (2, 'Players');
                INSERT INTO Tag (id, name, categoryId) VALUES (1, 'Two-Player', 2), (2, '2 players', 2), (3, 'Strategy', 1), (4, 'Abstract', 1);
                INSERT INTO GameTag (gameId, tagId) VALUES (1, 1), (1, 4), (2, 2), (2, 3);
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
            .overrideProvider(CacheService)
            .useValue(cache)
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    /** The tags on a game's page, as the player sees them. */
    const tagsOnGamePage = async (gameId: number) => {
        const response = await request(app.getHttpServer()).get(`/collection/users/2/games/${gameId}`).set(asPlayer).expect(200)

        return response.body.tags
    }

    it('shows the tag a game was moved to on the next read after a merge', async () => {
        expect(await tagsOnGamePage(1)).toEqual([
            { tag: 'Abstract', category: 'Genre' },
            { tag: 'Two-Player', category: 'Players' },
        ])
        // The page read went through the cache: the game itself is now kept.
        expect(cache.entries.has(cacheKeys.gameById(1))).toBe(true)

        const merged = await request(app.getHttpServer()).post('/admin/tags/1/merge').set(asAdmin).send({ intoTagId: 2 }).expect(200)

        expect(merged.body).toEqual({ gamesMoved: 1 })
        expect(await tagsOnGamePage(1)).toEqual([
            { tag: 'Abstract', category: 'Genre' },
            { tag: '2 players', category: 'Players' },
        ])
        // The game that already had the kept tag keeps it once.
        expect(await tagsOnGamePage(2)).toEqual([
            { tag: 'Strategy', category: 'Genre' },
            { tag: '2 players', category: 'Players' },
        ])
    })

    it('drops a deleted tag from the game page on the next read', async () => {
        expect(await tagsOnGamePage(1)).toContainEqual({ tag: 'Abstract', category: 'Genre' })

        await request(app.getHttpServer()).delete('/admin/tags/4').set(asAdmin).expect(200)

        expect(await tagsOnGamePage(1)).toEqual([{ tag: '2 players', category: 'Players' }])
    })

    it('lists only the tags still in use in the Browse filters', async () => {
        const response = await request(app.getHttpServer()).get('/collection/tags').set(asPlayer).expect(200)

        expect(response.body.map((tag: { name: string }) => tag.name).sort()).toEqual(['2 players', 'Strategy'])
    })

    it('never keeps a game’s tags in the cache, so no tag change has anything to clear', () => {
        expect([...cache.entries.keys()].filter(key => /tag/i.test(key))).toEqual([])
        // The cached game is the game row alone, with no tags inside it.
        expect(Object.keys(cache.entries.get(cacheKeys.gameById(1)) as object)).not.toContain('tags')
        expect(JSON.stringify([...cache.entries.values()])).not.toMatch(/Two-Player|2 players|Abstract|Strategy/)
    })
})
