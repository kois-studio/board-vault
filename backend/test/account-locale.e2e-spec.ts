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
const testDatabasePath = resolve(__dirname, 'account-locale.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

describe('the account language (e2e)', () => {
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
    const profile = async (userId: number, clerkUserId: string) =>
        (await request(app.getHttpServer()).get(`/profile/users/${userId}`).set(as(clerkUserId)).expect(200)).body

    it('has no language until the person chooses one', async () => {
        expect((await profile(1, 'user_ana')).locale).toBeNull()
    })

    it('saves a supported language on the account', async () => {
        await request(app.getHttpServer()).put('/users/1').set(as('user_ana')).send({ locale: 'es' }).expect(200)

        expect((await profile(1, 'user_ana')).locale).toBe('es')
    })

    it('refuses a language the interface does not have', async () => {
        await request(app.getHttpServer()).put('/users/1').set(as('user_ana')).send({ locale: 'pt' }).expect(400)
        await request(app.getHttpServer()).put('/users/1').set(as('user_ana')).send({ locale: 'ES' }).expect(400)

        expect((await profile(1, 'user_ana')).locale).toBe('es')
    })

    it("never changes someone else's language", async () => {
        await request(app.getHttpServer()).put('/users/2').set(as('user_ana')).send({ locale: 'de' }).expect(403)

        expect((await profile(2, 'user_ben')).locale).toBeNull()
    })
})
