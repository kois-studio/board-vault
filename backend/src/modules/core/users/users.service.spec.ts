import { BadRequestException, ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { fakeDatabase } from '../../../../test/fake-database.js'
import { AdminGuard } from '../../../common/guards/admin.guard.js'
import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard.js'
import { DatabaseService } from '../../common/database/database.service.js'

import { UsersController } from './users.controller.js'
import { UsersService } from './users.service.js'

import type { Mock } from 'vitest'

describe('UsersController profile update boundary', () => {
    let app: INestApplication
    let updateUserProfile: Mock
    let updateGames: Mock

    beforeEach(async () => {
        updateUserProfile = vi.fn(async (_userId: number, update: Record<string, unknown>) => {
            if (Object.keys(update).length === 0) {
                throw new BadRequestException('No fields to update')
            }

            return { rows: [{ id: 1 }] }
        })
        updateGames = vi.fn().mockResolvedValue(undefined)

        const module = await Test.createTestingModule({
            controllers: [UsersController],
            providers: [
                UsersService,
                { provide: DatabaseService, useValue: fakeDatabase({ updateUserProfile, updateGames }) },
                AuthGuard,
                UserOwnershipGuard,
                AdminGuard,
            ],
        })
            .overrideGuard(AuthGuard)
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

    it('accepts a valid profile update', async () => {
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
            })
            .expect(200)

        expect(updateUserProfile).toHaveBeenCalledWith(1, {
            username: 'safe-user',
            displayName: 'Safe User',
            avatar,
        })
    })

    it('rejects privileged or unexpected fields before persistence', async () => {
        await request(app.getHttpServer()).put('/users/1').send({ username: 'safe-user', isAdmin: true }).expect(400)

        expect(updateUserProfile).not.toHaveBeenCalled()
    })

    it('rejects a request containing only privileged fields', async () => {
        await request(app.getHttpServer())
            .put('/users/1')
            .send({ isAdmin: true, email_verified: true, verification_token: 'attacker-token' })
            .expect(400)

        expect(updateUserProfile).not.toHaveBeenCalled()
    })

    it('rejects malformed nested avatar data', async () => {
        await request(app.getHttpServer())
            .put('/users/1')
            .send({ avatar: { type: 'unsupported', initials: 42 } })
            .expect(400)

        expect(updateUserProfile).not.toHaveBeenCalled()
    })

    it('rejects malformed game collection update data', async () => {
        await request(app.getHttpServer())
            .put('/users/1/games')
            .send({ gamesToAdd: [1, '2'], gamesToRemove: [-3], unexpected: true })
            .expect(400)

        expect(updateGames).not.toHaveBeenCalled()
    })

    it('accepts a valid game collection update', async () => {
        await request(app.getHttpServer())
            .put('/users/1/games')
            .send({ gamesToAdd: [1, 2], gamesToRemove: [] })
            .expect(200)

        expect(updateGames).toHaveBeenCalledWith(1, [1, 2], [])
    })

    it('does not expose the deprecated global user list to a non-admin', async () => {
        await request(app.getHttpServer()).get('/users/').expect(403)
    })

    it('does not expose the deprecated account-creation route', async () => {
        await request(app.getHttpServer()).post('/users/').send({ email: 'new@example.com' }).expect(404)
    })
})
