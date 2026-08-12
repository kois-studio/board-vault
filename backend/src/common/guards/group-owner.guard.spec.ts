import { ExecutionContext, ForbiddenException } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'

import { GroupsController } from '../../modules/core/groups/groups.controller'
import { GroupsService } from '../../modules/core/groups/groups.service'

import { GroupOwnerGuard } from './group-owner.guard'
import { UserInGroupGuard } from './user-in-group.guard'

const createContext = (request: Record<string, unknown>): ExecutionContext =>
    ({
        switchToHttp: () => ({ getRequest: () => request }),
    }) as ExecutionContext

describe('GroupOwnerGuard', () => {
    it('allows the group owner', async () => {
        const groupsService = { getGroupById: jest.fn().mockResolvedValue({ id: 12, createdBy: 7 }) } as unknown as GroupsService
        const guard = new GroupOwnerGuard(groupsService)

        await expect(guard.canActivate(createContext({ user: { userId: 7 }, params: { groupId: '12' } }))).resolves.toBe(true)
    })

    it('denies a non-owner', async () => {
        const groupsService = { getGroupById: jest.fn().mockResolvedValue({ id: 12, createdBy: 7 }) } as unknown as GroupsService
        const guard = new GroupOwnerGuard(groupsService)

        await expect(guard.canActivate(createContext({ user: { userId: 8 }, params: { groupId: '12' } }))).rejects.toThrow(
            ForbiddenException,
        )
    })

    it('is attached to legacy group mutations', () => {
        const controller = GroupsController.prototype as unknown as Record<string, unknown>
        const getGuards = (method: string) => Reflect.getMetadata(GUARDS_METADATA, controller[method] as object) as Array<unknown>

        expect(getGuards('updateGroup')).toContain(GroupOwnerGuard)
        expect(getGuards('deleteGroupById')).toContain(GroupOwnerGuard)
        expect(getGuards('getGroupById')).toContain(UserInGroupGuard)
    })
})
