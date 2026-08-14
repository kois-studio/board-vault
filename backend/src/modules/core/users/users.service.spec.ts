import { BadRequestException, ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { AdminGuard } from '../../../common/guards/admin.guard'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
import { DatabaseService } from '../../common/database/database.service'

import { UsersController } from './users.controller'
import { UsersService } from './users.service'

describe('UsersController profile update boundary', () => {
    let app: INestApplication
    let updateUserProfile: jest.Mock

    beforeEach(async () => {
        updateUserProfile = jest.fn(async (_userId: number, update: Record<string, unknown>) => {
            if (Object.keys(update).length === 0) {
                throw new BadRequestException('No fields to update')
            }

            return { rows: [{ id: 1 }] }
        })

        const module = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                UsersService,
                { provide: DatabaseService, useValue: { updateUserProfile } },
                JwtAuthGuard,
                UserOwnershipGuard,
                AdminGuard,
            ],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    context.switchToHttp().getRequest().user = { userId: 1 }
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

    it('drops privileged fields from a profile update before persistence', async () => {
        const avatar = {
            backgroundColor: '#3B82F6',
            iconName: 'person-fill',
            emoji: null,
            type: 'icon',
            initials: 'DU',
        }

        await request(app.getHttpServer())
            .put('/users/1')
            .send({
                username: 'safe-user',
                displayName: 'Safe User',
                avatar,
                password: 'attacker-password',
                isAdmin: true,
                email_verified: true,
                verification_token: 'attacker-verification-token',
                password_reset_token: 'attacker-reset-token',
            })
            .expect(200)

        expect(updateUserProfile).toHaveBeenCalledWith(1, {
            username: 'safe-user',
            displayName: 'Safe User',
            avatar,
        })
    })

    it('rejects a request containing only privileged fields', async () => {
        await request(app.getHttpServer())
            .put('/users/1')
            .send({ isAdmin: true, email_verified: true, verification_token: 'attacker-token' })
            .expect(400)

        expect(updateUserProfile).toHaveBeenCalledWith(1, {})
    })

    it('does not expose the deprecated global user list to a non-admin', async () => {
        await request(app.getHttpServer()).get('/users/').expect(403)
    })
})
