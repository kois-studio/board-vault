import { GUARDS_METADATA } from '@nestjs/common/constants'

import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
import { CreateGroupMembershipRequestBody } from '../../../common/types/group-membership.type'

import { GroupMembershipsController } from './group-memberships.controller'
import { GroupMembershipsService } from './group-memberships.service'

describe('GroupMembershipsController actor identity', () => {
    it('scopes the legacy membership list to the authenticated account', async () => {
        const getGroupMembershipsByAccountId = jest.fn().mockResolvedValue([])
        const controller = new GroupMembershipsController({ getGroupMembershipsByAccountId } as unknown as GroupMembershipsService)

        await controller.getGroupMemberships({ user: { userId: 7 } })

        expect(getGroupMembershipsByAccountId).toHaveBeenCalledWith(7)
    })

    it('derives the membership account from the authenticated user', async () => {
        const createGroupMembershipFromInvitation = jest.fn().mockResolvedValue({ success: true })
        const controller = new GroupMembershipsController({ createGroupMembershipFromInvitation } as unknown as GroupMembershipsService)
        const body = { groupId: 12, accountId: 999 } as unknown as CreateGroupMembershipRequestBody

        await controller.createGroupMembership({ user: { userId: 7 } }, body)

        expect(createGroupMembershipFromInvitation).toHaveBeenCalledWith(7, 12)
    })

    it('protects legacy membership reads and deletes with ownership checks', () => {
        const controller = GroupMembershipsController.prototype as unknown as Record<string, unknown>
        const getGuards = (method: string) => Reflect.getMetadata(GUARDS_METADATA, controller[method] as object) as Array<unknown>

        expect(getGuards('getGroupMembershipById')).toContain(UserOwnershipGuard)
        expect(getGuards('deleteGroupMembershipById')).toContain(UserOwnershipGuard)
    })
})
