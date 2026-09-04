import { GUARDS_METADATA } from '@nestjs/common/constants'

import { AdminGuard } from '../../../common/guards/admin.guard'

import { AdminController } from './admin.controller'
import { AdminService } from './admin.service'

describe('AdminController reviewer identity', () => {
    const request = { user: { userId: 7 } }

    it('derives the approval reviewer from the authenticated user', async () => {
        const approveGameProposal = jest.fn().mockResolvedValue({ success: true })
        const controller = new AdminController({ approveGameProposal } as unknown as AdminService)
        const body = { reviewNotes: 'approved' }

        await controller.approveGameProposal(request, 12, body)

        expect(approveGameProposal).toHaveBeenCalledWith(12, 7, body)
    })

    it('derives rejection and duplicate reviewers from the authenticated user', async () => {
        const rejectGameProposal = jest.fn().mockResolvedValue({ success: true })
        const markGameProposalAsDuplicate = jest.fn().mockResolvedValue({ success: true })
        const controller = new AdminController({ rejectGameProposal, markGameProposalAsDuplicate } as unknown as AdminService)

        await controller.rejectGameProposal(request, 12, { reviewNotes: 'duplicate' })
        await controller.markGameProposalAsDuplicate(request, 12, 'duplicate')

        expect(rejectGameProposal).toHaveBeenCalledWith(12, 7, { reviewNotes: 'duplicate' })
        expect(markGameProposalAsDuplicate).toHaveBeenCalledWith(12, 7, 'duplicate')
    })

    it('keeps admin authorization on the controller', () => {
        expect(Reflect.getMetadata(GUARDS_METADATA, AdminController)).toContain(AdminGuard)
    })
})
