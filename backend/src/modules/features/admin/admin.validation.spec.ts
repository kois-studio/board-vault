import { ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import request from 'supertest'

import { AdminGuard } from '../../../common/guards/admin.guard'
import { AuthGuard } from '../../../common/guards/auth.guard'

import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

import type { Mock } from 'vitest'

describe('AdminController write validation', () => {
    let app: INestApplication
    let rejectGameProposal: Mock
    let markGameProposalAsDuplicate: Mock

    beforeEach(async () => {
        rejectGameProposal = vi.fn().mockResolvedValue({ success: true })
        markGameProposalAsDuplicate = vi.fn().mockResolvedValue({ success: true })

        const module = await Test.createTestingModule({
            controllers: [AdminController],
            providers: [{ provide: AdminService, useValue: { rejectGameProposal, markGameProposalAsDuplicate } }],
        })
            .overrideGuard(AuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    context.switchToHttp().getRequest().user = { userId: 7 }
                    return true
                },
            })
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

    it('rejects oversized duplicate-review notes before the service is called', async () => {
        await request(app.getHttpServer())
            .post('/admin/proposals/12/duplicate?reviewNotes=' + 'a'.repeat(281))
            .expect(400)

        expect(markGameProposalAsDuplicate).not.toHaveBeenCalled()
    })

    it('accepts bounded duplicate-review notes and passes them to the service', async () => {
        await request(app.getHttpServer()).post('/admin/proposals/12/duplicate?reviewNotes=already-present').expect(201)

        expect(markGameProposalAsDuplicate).toHaveBeenCalledWith(12, 7, 'already-present')
    })
})

describe('AdminController list query validation', () => {
    let app: INestApplication
    let getAdminGames: Mock
    let getAdminGameProposals: Mock

    beforeEach(async () => {
        getAdminGames = vi
            .fn()
            .mockResolvedValue({ games: [], pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 10 } })
        getAdminGameProposals = vi.fn().mockResolvedValue({
            proposals: [],
            pagination: { currentPage: 1, totalPages: 0, totalItems: 0, itemsPerPage: 10 },
        })

        const module = await Test.createTestingModule({
            controllers: [AdminController],
            providers: [{ provide: AdminService, useValue: { getAdminGames, getAdminGameProposals } }],
        })
            .overrideGuard(AuthGuard)
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

    it('rejects unsafe game-list pagination before the service is called', async () => {
        await request(app.getHttpServer()).get('/admin/games?page=0&limit=101').expect(400)

        expect(getAdminGames).not.toHaveBeenCalled()
    })

    it('rejects unknown proposal statuses before the service is called', async () => {
        await request(app.getHttpServer()).get('/admin/proposals?status=maybe').expect(400)

        expect(getAdminGameProposals).not.toHaveBeenCalled()
    })

    it('transforms valid list query values and applies defaults', async () => {
        await request(app.getHttpServer()).get('/admin/games?search=catan&page=2&limit=25').expect(200)
        await request(app.getHttpServer()).get('/admin/proposals?status=pending&page=3&limit=20').expect(200)

        expect(getAdminGames).toHaveBeenCalledWith('catan', 2, 25)
        expect(getAdminGameProposals).toHaveBeenCalledWith('pending', 3, 20)
    })
})
