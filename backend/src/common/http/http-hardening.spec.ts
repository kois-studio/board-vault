import express = require('express')
import * as request from 'supertest'

import { applySecurityHeaders, createBodyParsers } from './http-hardening'

describe('HTTP hardening', () => {
    let app: express.Express

    afterEach(() => {
        app = undefined as never
    })

    it('rejects JSON bodies over the configured limit', async () => {
        app = express()
        app.use(...createBodyParsers())
        app.post('/', (_request, response) => response.json({ ok: true }))

        await request(app)
            .post('/')
            .send({ payload: 'x'.repeat(101 * 1024) })
            .expect(413)
    })

    it('sets baseline response headers and production HSTS', async () => {
        app = express()
        app.use((request, response, next) => applySecurityHeaders(request, response, next, true))
        app.get('/', (_request, response) => response.json({ ok: true }))

        await request(app)
            .get('/')
            .expect(200)
            .expect('X-Content-Type-Options', 'nosniff')
            .expect('X-Frame-Options', 'DENY')
            .expect('Referrer-Policy', 'strict-origin-when-cross-origin')
            .expect('Permissions-Policy', 'camera=(), geolocation=(), microphone=()')
            .expect('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    })
})
