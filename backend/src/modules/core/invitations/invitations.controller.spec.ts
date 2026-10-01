import { GUARDS_METADATA } from '@nestjs/common/constants'

import { GroupOwnerGuard } from '../../../common/guards/group-owner.guard'
import { CreateInvitationByUsernameRequestBody, CreateInvitationRequestBody } from '../../../common/types/invitation.type'

import { InvitationsController } from './invitations.controller'
import { InvitationsService } from './invitations.service'

describe('InvitationsController actor identity', () => {
    it('derives the generic invitation sender from the authenticated user', async () => {
        const createInvitation = vi.fn().mockResolvedValue({ success: true })
        const controller = new InvitationsController({ createInvitation } as unknown as InvitationsService)
        const body = { groupId: 12, toAccountId: 8, fromAccountId: 999 } as unknown as CreateInvitationRequestBody

        await controller.createInvitation({ user: { userId: 7 } }, body)

        expect(createInvitation).toHaveBeenCalledWith({ groupId: 12, toAccountId: 8, fromAccountId: 7 })
    })

    it('derives the username invitation sender from the authenticated user', async () => {
        const createInvitationByUsername = vi.fn().mockResolvedValue({ id: 8 })
        const controller = new InvitationsController({ createInvitationByUsername } as unknown as InvitationsService)
        const body = { groupId: 12, username: 'target-user', fromAccountId: 999 } as unknown as CreateInvitationByUsernameRequestBody

        await controller.createInvitationByUsername({ user: { userId: 7 } }, body)

        expect(createInvitationByUsername).toHaveBeenCalledWith({ groupId: 12, username: 'target-user', fromAccountId: 7 })
    })

    it('preserves an owner-selected placeholder target while deriving the sender', async () => {
        const createInvitationByUsername = vi.fn().mockResolvedValue({ id: 8 })
        const controller = new InvitationsController({ createInvitationByUsername } as unknown as InvitationsService)
        const body = {
            groupId: 12,
            username: 'target-user',
            groupPersonId: 21,
            fromAccountId: 999,
        } as unknown as CreateInvitationByUsernameRequestBody

        await controller.createInvitationByUsername({ user: { userId: 7 } }, body)

        expect(createInvitationByUsername).toHaveBeenCalledWith({
            groupId: 12,
            username: 'target-user',
            groupPersonId: 21,
            fromAccountId: 7,
        })
    })

    it('requires group ownership for invitation creation', () => {
        const controller = InvitationsController.prototype as unknown as Record<string, unknown>
        const getGuards = (method: string) => Reflect.getMetadata(GUARDS_METADATA, controller[method] as object) as Array<unknown>

        expect(getGuards('createInvitation')).toContain(GroupOwnerGuard)
        expect(getGuards('createInvitationByUsername')).toContain(GroupOwnerGuard)
    })
})
