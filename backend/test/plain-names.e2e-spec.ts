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
const testDatabasePath = resolve(__dirname, 'plain-names.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

describe('names and prices stay readable (e2e, #350)', () => {
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
                    (1, 'ana@example.test', 'anaplays', ${avatar}, 'Ana Ruiz', 'user_ana', 0, 0),
                    (2, 'ben@example.test', 'benplays', ${avatar}, 'Ben Soto', 'user_ben', 0, 0);
                INSERT INTO Game (id, imageUrl, gameAvgDuration, minPlayers, maxPlayers) VALUES (1, '', 75, 3, 4);
                INSERT INTO GameEdition (gameId, languageCode, title, normalizedTitle, isPrimary) VALUES (1, 'en', 'Catan', 'catan', 1);
                INSERT INTO OwnedGame (accountId, gameId, purchasePrice) VALUES (1, 1, NULL);
                INSERT INTO UserGroup (id, name, createdBy) VALUES (10, 'Thursdays', 1);
                INSERT INTO GroupMembership (accountId, groupId) VALUES (1, 10), (2, 10);
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

    const as = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })
    const server = () => app.getHttpServer()

    it('refuses a display name drawn with long dashes, and keeps a plain one', async () => {
        await request(server()).put('/users/1').set(as('user_ana')).send({ displayName: '⸻⸻⸻⸻' }).expect(400)
        await request(server()).put('/users/1').set(as('user_ana')).send({ displayName: 'Ana ⸻' }).expect(400)
        await request(server()).put('/users/1').set(as('user_ana')).send({ displayName: 'Ana Ruiz-Sáez 🎲' }).expect(200)
    })

    it('refuses a group person whose name has invisible characters', async () => {
        await request(server()).post('/groups/10/people').set(as('user_ana')).send({ displayName: 'No\u202Era' }).expect(400)
        await request(server()).post('/groups/10/people').set(as('user_ana')).send({ displayName: 'Nora' }).expect(201)
    })

    it('caps what a copy cost at 10,000 euros', async () => {
        await request(server())
            .patch('/collection/users/1/games/1/ownership')
            .set(as('user_ana'))
            .send({ purchasePrice: 3e188 })
            .expect(400)
        await request(server())
            .patch('/collection/users/1/games/1/ownership')
            .set(as('user_ana'))
            .send({ purchasePrice: 10_001 })
            .expect(400)
        await request(server())
            .patch('/collection/users/1/games/1/ownership')
            .set(as('user_ana'))
            .send({ purchasePrice: 44.95 })
            .expect(200)
    })
})
