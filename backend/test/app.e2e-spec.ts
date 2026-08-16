import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'
import { rm } from 'node:fs/promises'

import { AppModule } from './../src/app.module'

const testDatabasePath = './test/.e2e.sqlite'

describe('HTTP security boundary (e2e)', () => {
    let app: INestApplication

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = 'test-token'
        process.env.JWT_SECRET = 'test-jwt-secret'
        process.env.RESEND_API_KEY = 're_test_key'
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        }).compile()

        app = moduleFixture.createNestApplication()
        await app.init()
    })

    afterAll(async () => {
        await app?.close()
        await rm(testDatabasePath, { force: true })
    })

    it('rejects an unauthenticated Clerk status request', () => {
        return request(app.getHttpServer())
            .get('/auth/clerk/status')
            .expect(401)
            .expect(({ body }) => expect(body.message).toEqual('A valid Clerk session is required'))
    })

    it('rejects invalid public query input before database access', () => {
        return request(app.getHttpServer())
            .get('/auth/check-email')
            .expect(400)
            .expect(({ body }) => expect(body.message).toEqual(expect.arrayContaining(['email must be an email'])))
    })
})
