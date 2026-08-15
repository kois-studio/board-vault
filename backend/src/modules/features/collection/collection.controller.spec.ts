import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'

import { CollectionController } from './collection.controller'
import { CollectionService } from './collection.service'

describe('CollectionController review validation', () => {
    let app: INestApplication
    let saveGameReview: jest.Mock
    let updateGameOwnership: jest.Mock

    beforeEach(async () => {
        saveGameReview = jest.fn().mockResolvedValue({ success: true })
        updateGameOwnership = jest.fn().mockResolvedValue({ success: true })

        const module = await Test.createTestingModule({
            controllers: [CollectionController],
            providers: [{ provide: CollectionService, useValue: { saveGameReview, updateGameOwnership } }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(VerifiedUserGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(UserOwnershipGuard)
            .useValue({ canActivate: () => true })
            .compile()

        app = module.createNestApplication()
        await app.init()
    })

    afterEach(async () => {
        await app.close()
    })

    it('accepts a review inside the database contract range', async () => {
        await request(app.getHttpServer()).post('/collection/users/1/reviews/2').send({ review: 8 }).expect(201)

        expect(saveGameReview).toHaveBeenCalledWith(1, 2, { review: 8 })
    })

    it('rejects reviews outside the database contract range or with extra fields', async () => {
        await request(app.getHttpServer()).post('/collection/users/1/reviews/2').send({ review: 11, unexpected: true }).expect(400)

        expect(saveGameReview).not.toHaveBeenCalled()
    })

    it('rejects malformed ownership metadata before service access', async () => {
        await request(app.getHttpServer())
            .patch('/collection/users/1/games/2/ownership')
            .send({ purchasePrice: 'free', unexpected: true })
            .expect(400)

        expect(updateGameOwnership).not.toHaveBeenCalled()
    })
})
