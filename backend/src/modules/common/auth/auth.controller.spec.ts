import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { ClerkAuthGuard } from '../../../common/guards/clerk-auth.guard'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { ClerkIdentityService } from './clerk-identity.service'

describe('AuthController password-reset validation', () => {
    let app: INestApplication
    let forgotPassword: jest.Mock
    let resetPassword: jest.Mock

    beforeEach(async () => {
        forgotPassword = jest.fn().mockResolvedValue(undefined)
        resetPassword = jest.fn().mockResolvedValue(true)

        const module = await Test.createTestingModule({
            controllers: [AuthController],
            providers: [
                {
                    provide: AuthService,
                    useValue: { forgotPassword, resetPassword },
                },
                {
                    provide: ClerkIdentityService,
                    useValue: {},
                },
            ],
        })
            .overrideGuard(ClerkAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .compile()

        app = module.createNestApplication()
        await app.init()
    })

    afterEach(async () => {
        await app.close()
    })

    it('rejects malformed forgot-password emails before the service call', async () => {
        await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: 'not-an-email' }).expect(400)

        expect(forgotPassword).not.toHaveBeenCalled()
    })

    it('rejects unexpected forgot-password fields', async () => {
        await request(app.getHttpServer()).post('/auth/forgot-password').send({ email: 'person@example.com', accountId: 7 }).expect(400)

        expect(forgotPassword).not.toHaveBeenCalled()
    })

    it('rejects empty reset passwords and unexpected fields', async () => {
        await request(app.getHttpServer()).post('/auth/reset-password/token').send({ password: '', isAdmin: true }).expect(400)

        expect(resetPassword).not.toHaveBeenCalled()
    })

    it('forwards a validated reset-password body', async () => {
        await request(app.getHttpServer()).post('/auth/reset-password/token').send({ password: 'new-password' }).expect(201)

        expect(resetPassword).toHaveBeenCalledWith('token', 'new-password')
    })
})
