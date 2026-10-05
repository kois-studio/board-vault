import { ExecutionContext, ForbiddenException } from '@nestjs/common'

import { GroupMembershipsService } from '../../modules/core/group-memberships/group-memberships.service.js'

import { UserInGroupGuard } from './user-in-group.guard.js'

const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
        switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext

describe('UserInGroupGuard', () => {
    it('accepts a group ID from an invitation request body', async () => {
        const getSafeGroupMembershipById = vi.fn().mockResolvedValue({ accountId: 7, groupId: 12 })
        const guard = new UserInGroupGuard({ getSafeGroupMembershipById } as unknown as GroupMembershipsService)

        await expect(guard.canActivate(createContext({ user: { userId: 7 }, params: {}, body: { groupId: 12 } }))).resolves.toBe(true)
        expect(getSafeGroupMembershipById).toHaveBeenCalledWith(7, 12)
    })

    it('denies a user who is not a member of the group', async () => {
        const getSafeGroupMembershipById = vi.fn().mockResolvedValue(null)
        const guard = new UserInGroupGuard({ getSafeGroupMembershipById } as unknown as GroupMembershipsService)

        await expect(guard.canActivate(createContext({ user: { userId: 7 }, params: {}, body: { groupId: 12 } }))).rejects.toThrow(
            ForbiddenException,
        )
    })
})
