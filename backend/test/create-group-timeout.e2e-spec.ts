import { execFileSync } from 'node:child_process'
import { readFileSync, rmSync } from 'node:fs'
import { resolve } from 'node:path'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { ApiErrorFilter } from './../src/common/http/api-error.filter.js'
import { ProviderTimeoutError } from './../src/common/http/provider-timeout.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { DatabaseService } from './../src/modules/common/database/database.service.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const repositoryRoot = resolve(__dirname, '../..')
const testDatabasePath = resolve(__dirname, 'create-group-timeout.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

const auth = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

/** Creating a group through the older `POST /groups` while the database stalls answers 503, not "404 User not found". */
describe('POST /groups when the database times out (e2e)', () => {
    let app: INestApplication
    let databaseService: DatabaseService

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
                INSERT INTO Account (id, email, username, avatar, displayName, clerkUserId)
                VALUES (1, 'ana@example.test', 'anita', ${avatar}, 'Ana Ruiz', 'user_ana');
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
        // As in main.ts: provider failures become their documented status and code.
        app.useGlobalFilters(new ApiErrorFilter())
        await app.init()
        databaseService = app.get(DatabaseService)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    it('answers 503 DATABASE_TIMEOUT, not 404, when the insert times out', async () => {
        const insert = vi.spyOn(databaseService.groups, 'createGroup').mockRejectedValueOnce(new ProviderTimeoutError('database'))

        const response = await request(app.getHttpServer()).post('/groups').set(auth('user_ana')).send({ name: 'Friday club' }).expect(503)

        expect(response.body).toMatchObject({ statusCode: 503, code: 'DATABASE_TIMEOUT' })
        expect(insert).toHaveBeenCalledWith({ name: 'Friday club', createdBy: 1 })
    })

    it('creates the group once the database answers', async () => {
        await request(app.getHttpServer())
            .post('/groups')
            .set(auth('user_ana'))
            .send({ name: 'Friday club' })
            .expect(201, { success: true })

        const rows = execFileSync('sqlite3', [testDatabasePath, 'SELECT name, createdBy FROM UserGroup'], { encoding: 'utf8' })

        expect(rows.trim().split(/\r?\n/)).toEqual(['Friday club|1'])
    })
})
