import { rm } from 'node:fs/promises'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import * as request from 'supertest'

import { AppModule } from './../src/app.module'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier'

const testDatabasePath = './test/.e2e.sqlite'

describe('HTTP security boundary (e2e)', () => {
    let app: INestApplication

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = 'test-token'
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ClerkTokenVerifier)
            .useValue(new FakeClerkTokenVerifier())
            .compile()

        app = moduleFixture.createNestApplication()
        await app.init()
    })

    afterAll(async () => {
        await app?.close()
        await rm(testDatabasePath, { force: true })
    })

    it('rejects an unauthenticated session status request', () => {
        return request(app.getHttpServer())
            .get('/auth/clerk/status')
            .expect(401)
            .expect(({ body }) => expect(body.message).toEqual('A valid session is required'))
    })

    it('rejects a session token that fails verification', () => {
        return request(app.getHttpServer()).get('/auth/clerk/status').set('Authorization', 'Bearer not-a-clerk-session').expect(401)
    })

    it.each([
        ['post', '/auth/login'],
        ['post', '/auth/register'],
        ['post', '/auth/forgot-password'],
    ] as const)('no longer serves the legacy %s %s route', (method, path) => {
        return request(app.getHttpServer())
            [method](path)
            .set('Authorization', `Bearer ${sessionFor('user_unknown')}`)
            .expect(404)
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
