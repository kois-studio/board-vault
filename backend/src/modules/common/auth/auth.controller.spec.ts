import { ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AuthGuard } from '../../../common/guards/auth.guard'

import { AuthController } from './auth.controller'

describe('AuthController', () => {
    let app: INestApplication

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            controllers: [AuthController],
        })
            .overrideGuard(AuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    context.switchToHttp().getRequest().user = {
                        userId: 7,
                        email: 'person@example.test',
                        isAdmin: false,
                        clerkUserId: 'user_clerk_7',
                    }
                    return true
                },
            })
            .compile()

        app = module.createNestApplication()
        await app.init()
    })

    afterEach(async () => {
        await app.close()
    })

    it('returns the Board Vault account behind the Clerk session', async () => {
        const response = await request(app.getHttpServer()).get('/auth/clerk/status').expect(200)

        expect(response.body).toEqual({ isValid: true, userId: 7, isAdmin: false, clerkUserId: 'user_clerk_7' })
    })

    it.each([
        ['post', '/auth/login'],
        ['post', '/auth/register'],
        ['get', '/auth/status'],
        ['get', '/auth/check-email'],
        ['get', '/auth/check-username'],
        ['get', '/auth/verify-email/550e8400-e29b-41d4-a716-446655440000'],
        ['post', '/auth/forgot-password'],
        ['post', '/auth/reset-password/550e8400-e29b-41d4-a716-446655440000'],
    ] as const)('no longer serves the legacy %s %s route', async (method, path) => {
        await request(app.getHttpServer())[method](path).expect(404)
    })
})
