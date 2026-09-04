import { ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { AdminGuard } from '../../../common/guards/admin.guard'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'

import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

describe('AdminController write validation', () => {
    let app: INestApplication
    let rejectGameProposal: jest.Mock

    beforeEach(async () => {
        rejectGameProposal = jest.fn().mockResolvedValue({ success: true })

        const module = await Test.createTestingModule({
            controllers: [AdminController],
            providers: [{ provide: AdminService, useValue: { rejectGameProposal } }],
        })
            .overrideGuard(JwtAuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    context.switchToHttp().getRequest().user = { userId: 7 }
                    return true
                },
            })
            .overrideGuard(VerifiedUserGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(AdminGuard)
            .useValue({ canActivate: () => true })
            .compile()

        app = module.createNestApplication()
        await app.init()
    })

    afterEach(async () => {
        await app.close()
    })

    it('rejects unexpected proposal-review fields before the service is called', async () => {
        await request(app.getHttpServer())
            .post('/admin/proposals/12/reject')
            .send({ reviewNotes: 'duplicate', reviewerId: 999 })
            .expect(400)

        expect(rejectGameProposal).not.toHaveBeenCalled()
    })

    it('accepts a valid proposal-review body and derives the reviewer from auth', async () => {
        await request(app.getHttpServer()).post('/admin/proposals/12/reject').send({ reviewNotes: 'duplicate' }).expect(201)

        expect(rejectGameProposal).toHaveBeenCalledWith(12, 7, { reviewNotes: 'duplicate' })
    })

    it('rejects a non-numeric proposal id before the service is called', async () => {
        await request(app.getHttpServer()).post('/admin/proposals/not-a-number/reject').send({ reviewNotes: 'duplicate' }).expect(400)

        expect(rejectGameProposal).not.toHaveBeenCalled()
    })
})
