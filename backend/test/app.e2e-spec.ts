import { createHmac } from 'node:crypto'

import { INestApplication } from '@nestjs/common'
import { Test, TestingModule } from '@nestjs/testing'
import request from 'supertest'

import { AppModule } from './../src/app.module.js'
import { createBodyParsers } from './../src/common/http/http-hardening.js'
import { ClerkTokenVerifier } from './../src/modules/common/auth/clerk-token-verifier.js'
import { FakeClerkTokenVerifier, sessionFor } from './fake-clerk-token-verifier.js'
import { removeTestDatabase } from './remove-test-database.js'

const testDatabasePath = './test/.e2e.sqlite'
const webhookKey = Buffer.from('board-vault-e2e-webhook-signing-key')

// Signs a payload the way Clerk (Svix / Standard Webhooks) does.
function svixHeaders(body: string, key = webhookKey): Record<string, string> {
    const id = 'msg_e2e'
    const timestamp = String(Math.floor(Date.now() / 1000))
    const signature = createHmac('sha256', key).update(`${id}.${timestamp}.${body}`).digest('base64')

    return { 'svix-id': id, 'svix-timestamp': timestamp, 'svix-signature': `v1,${signature}`, 'content-type': 'application/json' }
}

describe('HTTP security boundary (e2e)', () => {
    let app: INestApplication

    beforeAll(async () => {
        process.env.NODE_ENV = 'test'
        process.env.TURSO_DATABASE_URL = `file:${testDatabasePath}`
        process.env.TURSO_AUTH_TOKEN = 'test-token'
        process.env.UPSTASH_REDIS_REST_DISABLE = 'true'
        process.env.CLERK_WEBHOOK_SIGNING_SECRET = `whsec_${webhookKey.toString('base64')}`

        const moduleFixture: TestingModule = await Test.createTestingModule({
            imports: [AppModule],
        })
            .overrideProvider(ClerkTokenVerifier)
            .useValue(new FakeClerkTokenVerifier())
            .compile()

        // Mirror main.ts: the production body parsers keep webhook bodies raw.
        app = moduleFixture.createNestApplication({ bodyParser: false })
        app.use(...createBodyParsers())
        await app.init()
    })

    afterAll(async () => {
        await app?.close()
        removeTestDatabase(testDatabasePath)
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
    ] as const)('no longer serves the legacy %s %s route', async (method, path) => {
        await request(app.getHttpServer())
            [method](path)
            .set('Authorization', `Bearer ${sessionFor('user_unknown')}`)
            .expect(404)
    })

    it.each([
        ['group acquisition board', () => request(app.getHttpServer()).get('/groups/7/acquisition-board')],
        ['recommendation signals', () => request(app.getHttpServer()).get('/play/recommendations/signals?groupId=7')],
        ['session scheduling', () => request(app.getHttpServer()).post('/sessions/scheduled').send({ groupId: 7 })],
        ['collection activation', () => request(app.getHttpServer()).post('/collection/users/7/games/42')],
    ])('rejects unauthenticated %s before domain access', async (_name, buildRequest) => {
        await buildRequest().expect(401)
    })

    it('accepts a Clerk webhook signed over the exact request body', () => {
        const body = JSON.stringify({ type: 'session.created', object: 'event', data: { id: 'sess_e2e' } })

        return request(app.getHttpServer()).post('/webhooks/clerk').set(svixHeaders(body)).send(body).expect(204)
    })

    it('rejects a forged Clerk webhook', () => {
        const body = JSON.stringify({ type: 'user.deleted', object: 'event', data: { id: 'user_e2e', deleted: true } })

        return request(app.getHttpServer())
            .post('/webhooks/clerk')
            .set(svixHeaders(body, Buffer.from('not-the-signing-key')))
            .send(body)
            .expect(400)
    })
})
