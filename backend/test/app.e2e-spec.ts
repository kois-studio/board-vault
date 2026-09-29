import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'

import { AppModule } from './../src/app.module'
import { removeTestDatabase } from './remove-test-database'

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
        removeTestDatabase(testDatabasePath)
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

    it.each([
        ['group acquisition board', () => request(app.getHttpServer()).get('/groups/7/acquisition-board')],
        ['recommendation signals', () => request(app.getHttpServer()).get('/play/recommendations/signals?groupId=7')],
        ['session scheduling', () => request(app.getHttpServer()).post('/sessions/scheduled').send({ groupId: 7 })],
        ['collection activation', () => request(app.getHttpServer()).post('/collection/users/7/games/42')],
    ])('rejects unauthenticated %s before domain access', (_name, buildRequest) => {
        return buildRequest().expect(401)
    })
})
