import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ApiErrorFilter } from './../src/common/http/api-error.filter.js'
import { RARELY_CHANGING_CACHE } from './../src/common/http/rarely-changing.interceptor.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { DatabaseService } from './../src/modules/common/database/database.service.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'catalogue-tags-cache.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`
const appOrigin = 'https://app.board-vault.test'
const asPlayer = { Authorization: `Bearer ${sessionFor('user_player')}`, Origin: appOrigin }

/**
 * #254: the catalogue tags change only when the catalogue does, so the reader's browser may keep
 * them. Only a successful answer is kept, it is kept per language, and no other route changes.
 */
describe('catalogue tags in the browser cache (e2e)', () => {
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
                INSERT INTO Game (id, imageUrl) VALUES (1, '');
                INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES (1, 'en', 'Azul', 'azul', 1);
                INSERT INTO TagCategory (id, name) VALUES (1, 'Genre');
                INSERT INTO Tag (id, name, categoryId) VALUES (1, 'Abstract', 1);
                INSERT INTO GameTag (gameId, tagId) VALUES (1, 1);
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
        // As main.ts does: with a list of origins, CORS answers `Vary: Origin`, which must survive.
        app.enableCors({ origin: [appOrigin] })
        app.useGlobalFilters(new ApiErrorFilter())
        await app.init()
    })

    afterEach(() => vi.restoreAllMocks())

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    const server = () => request(app.getHttpServer())
    const varyOn = (header: string | undefined) => (header ?? '').split(',').map(name => name.trim().toLowerCase())

    it('lets the browser keep the tags, per language and per origin', async () => {
        const response = await server().get('/collection/tags').set(asPlayer).expect(200)

        expect(response.body).toEqual([{ id: 1, name: 'Abstract', categoryName: 'Genre', gameCount: 1 }])
        expect(response.headers['cache-control']).toBe(RARELY_CHANGING_CACHE)
        expect(RARELY_CHANGING_CACHE).toBe('private, max-age=300, stale-while-revalidate=86400')
        expect(varyOn(response.headers['vary'])).toEqual(expect.arrayContaining(['origin', 'accept-language']))
        expect(response.headers['access-control-allow-origin']).toBe(appOrigin)
    })

    it('never lets the browser keep a failed answer', async () => {
        vi.spyOn(app.get(DatabaseService).games, 'getCatalogueTags').mockRejectedValueOnce(new Error('database down'))

        const response = await server().get('/collection/tags').set(asPlayer).expect(500)

        expect(response.body).toMatchObject({ statusCode: 500, requestId: expect.any(String) })
        expect(response.headers['cache-control']).toBeUndefined()
        expect(varyOn(response.headers['vary'])).not.toContain('accept-language')
    })

    it('never lets the browser keep a refused answer', async () => {
        const response = await server().get('/collection/tags').set('Origin', appOrigin).expect(401)

        expect(response.headers['cache-control']).toBeUndefined()
    })

    it('leaves every other answer as it was', async () => {
        const response = await server().get('/collection/users/1/games').set(asPlayer).expect(200)

        expect(response.headers['cache-control']).toBeUndefined()
        expect(varyOn(response.headers['vary'])).not.toContain('accept-language')
    })
})
