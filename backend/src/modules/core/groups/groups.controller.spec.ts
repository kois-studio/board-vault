import { CreateGroupRequestBody } from '../../../common/types/group.type'

import { GroupsController } from './groups.controller'
import { GroupsService } from './groups.service'

describe('GroupsController actor and listing boundaries', () => {
    const request = { user: { userId: 7 } }

    it('scopes the legacy group list to the authenticated account', async () => {
        const getGroupsForAccount = jest.fn().mockResolvedValue([])
        const controller = new GroupsController({ getGroupsForAccount } as unknown as GroupsService)

        await controller.getGroups(request)

        expect(getGroupsForAccount).toHaveBeenCalledWith(7)
    })

    it('derives the legacy group creator from the authenticated account', async () => {
        const createGroup = jest.fn().mockResolvedValue({ success: true })
        const controller = new GroupsController({ createGroup } as unknown as GroupsService)
        const body = { name: 'Test group', createdBy: 999 } as unknown as CreateGroupRequestBody

        await controller.createGroup(request, body)

        expect(createGroup).toHaveBeenCalledWith({ name: 'Test group', createdBy: 7 })
    })
})
