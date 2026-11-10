import { UpdateGroupAcquisitionDecisionBody } from '../../../common/types/group-game-interest.type.js'
import { CreateGroupRequestBody } from '../../../common/types/group.type.js'

import { GroupAcquisitionService } from './group-acquisition.service.js'
import { GroupActivityService } from './group-activity.service.js'
import { GroupInsightsService } from './group-insights.service.js'
import { GroupsController } from './groups.controller.js'
import { GroupsService } from './groups.service.js'

describe('GroupsController actor and listing boundaries', () => {
    const request = { user: { userId: 7 } }

    it('scopes the legacy group list to the authenticated account', async () => {
        const getGroupsForAccount = vi.fn().mockResolvedValue([])
        const controller = new GroupsController(
            { getGroupsForAccount } as unknown as GroupsService,
            {} as GroupAcquisitionService,
            {} as GroupInsightsService,
            {} as GroupActivityService,
        )

        await controller.getGroups(request)

        expect(getGroupsForAccount).toHaveBeenCalledWith(7)
    })

    it('derives the legacy group creator from the authenticated account', async () => {
        const createGroup = vi.fn().mockResolvedValue({ success: true })
        const controller = new GroupsController(
            { createGroup } as unknown as GroupsService,
            {} as GroupAcquisitionService,
            {} as GroupInsightsService,
            {} as GroupActivityService,
        )
        const body = { name: 'Test group', createdBy: 999 } as unknown as CreateGroupRequestBody

        await controller.createGroup(request, body)

        expect(createGroup).toHaveBeenCalledWith({ name: 'Test group', createdBy: 7 })
    })

    it('derives the acquisition decision owner from the authenticated account', async () => {
        const updateDecision = vi.fn().mockResolvedValue({ success: true })
        const controller = new GroupsController(
            {} as GroupsService,
            { updateDecision } as unknown as GroupAcquisitionService,
            {} as GroupInsightsService,
            {} as GroupActivityService,
        )
        const body = { status: 'planned' } as UpdateGroupAcquisitionDecisionBody

        await controller.updateAcquisitionDecision(12, 42, request, body)

        expect(updateDecision).toHaveBeenCalledWith(12, 7, 42, body)
    })
})
