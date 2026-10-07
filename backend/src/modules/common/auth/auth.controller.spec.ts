import { ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AuthGuard } from '../../../common/guards/auth.guard.js'

import { AccountDeletionService } from './account-deletion.service.js'
import { AuthController } from './auth.controller.js'

describe('AuthController', () => {
    let app: INestApplication
    const accountDeletion = { deleteOwnAccount: vi.fn().mockResolvedValue(undefined) }

    beforeEach(async () => {
        accountDeletion.deleteOwnAccount.mockClear()
        const module = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [{ provide: AccountDeletionService, useValue: accountDeletion }],
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

    it('deletes the signed-in account, never one named by the client', async () => {
        await request(app.getHttpServer()).delete('/auth/account').send({ userId: 99 }).expect(204)

        expect(accountDeletion.deleteOwnAccount).toHaveBeenCalledWith(7, 'user_clerk_7')
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
