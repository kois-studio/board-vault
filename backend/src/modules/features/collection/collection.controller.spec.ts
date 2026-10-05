import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard.js'

import { CollectionController } from './collection.controller.js'
import { CollectionService } from './collection.service.js'

import type { Mock } from 'vitest'

describe('CollectionController review validation', () => {
    let app: INestApplication
    let saveGameReview: Mock
    let updateGameOwnership: Mock
    let browseCatalogue: Mock

    beforeEach(async () => {
        saveGameReview = vi.fn().mockResolvedValue({ success: true })
        updateGameOwnership = vi.fn().mockResolvedValue({ success: true })
        browseCatalogue = vi.fn().mockResolvedValue({ games: [], pagination: {} })

        const module = await Test.createTestingModule({
            controllers: [CollectionController],
            providers: [{ provide: CollectionService, useValue: { saveGameReview, updateGameOwnership, browseCatalogue } }],
        })
            .overrideGuard(AuthGuard)
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

    it('rejects an oversized browse search before the service is called', async () => {
        await request(app.getHttpServer())
            .get(`/collection/users/1/browse/games?search=${'a'.repeat(101)}`)
            .expect(400)

        expect(browseCatalogue).not.toHaveBeenCalled()
    })

    it('transforms browse query values and applies safe defaults', async () => {
        await request(app.getHttpServer()).get('/collection/users/1/browse/games?search=catan&page=2&limit=20').expect(200)

        expect(browseCatalogue).toHaveBeenCalledWith(
            1,
            expect.objectContaining({ search: 'catan', page: 2, limit: 20, tags: [], hideOwned: false, sort: 'title' }),
        )
    })
})
