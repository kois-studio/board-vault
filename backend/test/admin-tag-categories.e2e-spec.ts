import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'admin-tag-categories.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

describe('admin tag categories (e2e)', () => {
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
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId, isAdmin, isDeleted) VALUES
                    (1, 'admin@example.test', 'admin', ${avatar}, 'Admin', 'user_admin', 1, 0),
                    (2, 'player@example.test', 'player', ${avatar}, 'Player', 'user_player', 0, 0);

                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES
                    (1, 'https://example.test/azul.jpg', 45, 2, 4),
                    (2, 'https://example.test/catan.jpg', 90, 3, 4);

                INSERT INTO TagCategory (id, name) VALUES (1, 'Genre'), (2, 'Mechanic'), (3, 'Empty');
                INSERT INTO Tag (id, name, categoryId) VALUES (1, 'Abstract', 1), (2, 'Strategy', 1), (3, 'Trading', 2);
                -- Azul has two Genre tags: it must count once for Genre.
                INSERT INTO GameTag (gameId, tagId) VALUES (1, 1), (1, 2), (2, 2), (2, 3);
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

    const asAdmin = { Authorization: `Bearer ${sessionFor('user_admin')}` }

    it('lists categories with tag ids and distinct game counts', async () => {
        const response = await request(app.getHttpServer()).get('/admin/tag-categories').set(asAdmin).expect(200)

        expect(response.body).toEqual([
            { id: 1, name: 'Genre', tags: [1, 2], gameCount: 2 },
            { id: 2, name: 'Mechanic', tags: [3], gameCount: 1 },
            { id: 3, name: 'Empty', tags: [], gameCount: 0 },
        ])
    })

    it('returns the same shape when creating and renaming a category', async () => {
        const created = await request(app.getHttpServer()).post('/admin/tag-categories').set(asAdmin).send({ name: 'Theme' }).expect(201)

        expect(created.body).toEqual({ id: expect.any(Number), name: 'Theme', tags: [], gameCount: 0 })

        const renamed = await request(app.getHttpServer())
            .put('/admin/tag-categories/2')
            .set(asAdmin)
            .send({ name: 'Mechanism' })
            .expect(200)

        expect(renamed.body).toEqual({ id: 2, name: 'Mechanism', tags: [3], gameCount: 1 })
    })

    it('answers 404 when renaming a category that does not exist', async () => {
        await request(app.getHttpServer()).put('/admin/tag-categories/999').set(asAdmin).send({ name: 'Ghost' }).expect(404)
    })

    it('is only for admins', async () => {
        await request(app.getHttpServer())
            .get('/admin/tag-categories')
            .set({ Authorization: `Bearer ${sessionFor('user_player')}` })
            .expect(403)
    })
})
