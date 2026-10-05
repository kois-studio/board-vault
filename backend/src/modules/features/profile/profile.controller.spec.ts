import { INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard.js'
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard.js'

import { ProfileController } from './profile.controller.js'
import { ProfileService } from './profile.service.js'

import type { Mock } from 'vitest'

describe('ProfileController proposal validation', () => {
    let app: INestApplication
    let createGameProposal: Mock

    beforeEach(async () => {
        createGameProposal = vi.fn().mockResolvedValue({ id: 1, title: 'Catan' })

        const module = await Test.createTestingModule({
            controllers: [ProfileController],
            providers: [{ provide: ProfileService, useValue: { createGameProposal } }],
        })
            .overrideGuard(AuthGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(UserOwnershipGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(RateLimitGuard)
            .useValue({ canActivate: () => true })
            .compile()

        app = module.createNestApplication()
        await app.init()
    })

    afterEach(async () => {
        await app.close()
    })

    it('accepts a typed proposal payload', async () => {
        await request(app.getHttpServer())
            .post('/profile/users/1/proposals')
            .send({ title: 'Catan', gameAvgDuration: 60, minPlayers: 3, maxPlayers: 4, notes: 'Family game' })
            .expect(201)

        expect(createGameProposal).toHaveBeenCalledWith(1, {
            title: 'Catan',
            gameAvgDuration: 60,
            minPlayers: 3,
            maxPlayers: 4,
            notes: 'Family game',
        })
    })

    it('rejects malformed proposal fields and unexpected fields', async () => {
        await request(app.getHttpServer())
            .post('/profile/users/1/proposals')
            .send({ title: '', gameAvgDuration: -1, unexpected: true })
            .expect(400)

        expect(createGameProposal).not.toHaveBeenCalled()
    })
})
