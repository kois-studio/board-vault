import { ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard.js'

import { AccountDeletionService } from './account-deletion.service.js'
import { AuthController } from './auth.controller.js'
import { ClerkAccountSyncService } from './clerk-account-sync.service.js'
import { ClerkIdentityService } from './clerk-identity.service.js'

describe('AuthController', () => {
    let app: INestApplication
    const accountDeletion = { deleteOwnAccount: vi.fn().mockResolvedValue(undefined) }
    const profile = { clerkUserId: 'user_clerk_7', username: 'ana_plays', primaryEmail: 'person@example.test', primaryEmailVerified: true }
    const clerkIdentity = { getClerkProfile: vi.fn() }
    const accountSync = { apply: vi.fn() }

    beforeEach(async () => {
        accountDeletion.deleteOwnAccount.mockClear()
        clerkIdentity.getClerkProfile.mockReset().mockResolvedValue(profile)
        accountSync.apply.mockReset().mockResolvedValue({ username: 'updated', email: 'unchanged' })
        const module = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                { provide: AccountDeletionService, useValue: accountDeletion },
                { provide: ClerkIdentityService, useValue: clerkIdentity },
                { provide: ClerkAccountSyncService, useValue: accountSync },
            ],
        })
            .overrideGuard(RateLimitGuard)
            .useValue({ canActivate: () => true })
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

    it('copies the signed-in user from Clerk, never values sent by the client', async () => {
        const response = await request(app.getHttpServer())
            .post('/auth/sync-from-clerk')
            .send({ username: 'someone_else', clerkUserId: 'user_other' })
            .expect(200)

        expect(clerkIdentity.getClerkProfile).toHaveBeenCalledWith('user_clerk_7')
        expect(accountSync.apply).toHaveBeenCalledWith(profile)
        expect(response.body).toEqual({ username: 'updated', email: 'unchanged' })
    })

    it('says when another account already has the username', async () => {
        accountSync.apply.mockResolvedValue({ username: 'taken', email: 'unchanged' })

        const response = await request(app.getHttpServer()).post('/auth/sync-from-clerk').expect(200)

        expect(response.body.username).toBe('taken')
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
