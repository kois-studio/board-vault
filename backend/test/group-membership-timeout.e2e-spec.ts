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
const testDatabasePath = resolve(__dirname, 'group-membership-timeout.e2e.sqlite')
const avatar = `'{"backgroundColor":"#2563EB","iconName":null,"emoji":"😎","type":"emoji","initials":""}'`

const auth = (clerkUserId: string) => ({ Authorization: `Bearer ${sessionFor(clerkUserId)}` })

/**
 * A member's group routes check membership first (UserInGroupGuard). When that lookup times out, the member hears
 * "Board Vault is slow" (503 DATABASE_TIMEOUT), never "you are not in this group" (403) (#245).
 */
describe('group routes when the membership lookup times out (e2e)', () => {
    let app: INestApplication
    let databaseService: DatabaseService
    let groupId: number

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
                VALUES
                    (1, 'ana@example.test', 'anita', ${avatar}, 'Ana Ruiz', 'user_ana'),
                    (2, 'bruno@example.test', 'bruno', ${avatar}, 'Bruno', 'user_bruno');
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

        const created = await request(app.getHttpServer())
            .post('/dashboard/users/1/groups/create/tuesday_club')
            .set(auth('user_ana'))
            .expect(201)

        groupId = Number(created.body.groupId)
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
    })

    it('lets a member in while the database answers', async () => {
        await request(app.getHttpServer()).get(`/groups/${groupId}/insights`).set(auth('user_ana')).expect(200)
    })

    it('answers 503 DATABASE_TIMEOUT, not 403, when the membership query times out', async () => {
        const lookup = vi
            .spyOn(databaseService.groups, 'getGroupMembershipById')
            .mockRejectedValueOnce(new ProviderTimeoutError('database'))

        const response = await request(app.getHttpServer()).get(`/groups/${groupId}/insights`).set(auth('user_ana')).expect(503)

        expect(response.body).toMatchObject({ statusCode: 503, code: 'DATABASE_TIMEOUT' })
        expect(lookup).toHaveBeenCalledWith(1, groupId)
    })

    it('answers 500, not 403, when the membership query fails another way', async () => {
        vi.spyOn(databaseService.groups, 'getGroupMembershipById').mockRejectedValueOnce(new Error('SQLITE_BUSY'))

        const response = await request(app.getHttpServer()).get(`/groups/${groupId}/insights`).set(auth('user_ana')).expect(500)

        expect(response.body).toMatchObject({ statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Request failed' })
        expect(JSON.stringify(response.body)).not.toContain('SQLITE_BUSY')
    })

    it('still answers 403 to an account that is not in the group', async () => {
        const response = await request(app.getHttpServer()).get(`/groups/${groupId}/insights`).set(auth('user_bruno')).expect(403)

        expect(response.body).toMatchObject({
            statusCode: 403,
            message: 'You are not a member of this group and do not have permission to access this information',
        })
    })

    it('lets the member in again once the database answers', async () => {
        await request(app.getHttpServer()).get(`/groups/${groupId}/insights`).set(auth('user_ana')).expect(200)
    })
})
