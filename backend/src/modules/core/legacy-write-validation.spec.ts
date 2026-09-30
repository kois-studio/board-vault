import { ExecutionContext, INestApplication } from '@nestjs/common'
import { Test } from '@nestjs/testing'
import * as request from 'supertest'

import { AuthGuard } from '../../common/guards/auth.guard'
import { GroupOwnerGuard } from '../../common/guards/group-owner.guard'
import { UserInGroupGuard } from '../../common/guards/user-in-group.guard'
import { ClerkIdentityService } from '../common/auth/clerk-identity.service'

import { GroupMembershipsController } from './group-memberships/group-memberships.controller'
import { GroupMembershipsService } from './group-memberships/group-memberships.service'
import { GroupAcquisitionService } from './groups/group-acquisition.service'
import { GroupsController } from './groups/groups.controller'
import { GroupsService } from './groups/groups.service'
import { InvitationsController } from './invitations/invitations.controller'
import { InvitationsService } from './invitations/invitations.service'
import { NotificationsController } from './notifications/notifications.controller'
import { NotificationsService } from './notifications/notifications.service'

describe('Legacy write DTO validation', () => {
    let app: INestApplication
    const createGroup = jest.fn().mockResolvedValue({ success: true })
    const createInvitation = jest.fn().mockResolvedValue({ success: true })
    const createNotification = jest.fn().mockResolvedValue({ success: true })
    const createGroupMembershipFromInvitation = jest.fn().mockResolvedValue({ success: true })

    beforeEach(async () => {
        const module = await Test.createTestingModule({
            controllers: [GroupsController, InvitationsController, NotificationsController, GroupMembershipsController],
            providers: [
                { provide: GroupsService, useValue: { createGroup } },
                { provide: GroupAcquisitionService, useValue: {} },
                { provide: ClerkIdentityService, useValue: {} },
                { provide: InvitationsService, useValue: { createInvitation } },
                { provide: NotificationsService, useValue: { createNotification } },
                { provide: GroupMembershipsService, useValue: { createGroupMembershipFromInvitation } },
            ],
        })
            .overrideGuard(AuthGuard)
            .useValue({
                canActivate: (context: ExecutionContext) => {
                    context.switchToHttp().getRequest().user = { userId: 7 }
                    return true
                },
            })
            .overrideGuard(UserInGroupGuard)
            .useValue({ canActivate: () => true })
            .overrideGuard(GroupOwnerGuard)
            .useValue({ canActivate: () => true })
            .compile()

        app = module.createNestApplication()
        await app.init()
        jest.clearAllMocks()
    })

    afterEach(async () => {
        await app.close()
    })

    it('rejects unexpected group fields before persistence', async () => {
        await request(app.getHttpServer()).post('/groups').send({ name: 'Game night', createdBy: 999 }).expect(400)

        expect(createGroup).not.toHaveBeenCalled()
    })

    it('rejects oversized group names before persistence', async () => {
        await request(app.getHttpServer())
            .post('/groups')
            .send({ name: 'a'.repeat(101) })
            .expect(400)

        expect(createGroup).not.toHaveBeenCalled()
    })

    it('rejects malformed invitation fields before persistence', async () => {
        await request(app.getHttpServer()).post('/invitations').send({ groupId: '12', toAccountId: 8 }).expect(400)

        expect(createInvitation).not.toHaveBeenCalled()
    })

    it('rejects unexpected notification fields before persistence', async () => {
        await request(app.getHttpServer())
            .post('/notifications')
            .send({ type: 'test', message: 'message', data: {}, accountId: 999 })
            .expect(400)

        expect(createNotification).not.toHaveBeenCalled()
    })

    it('rejects malformed membership references before persistence', async () => {
        await request(app.getHttpServer()).post('/memberships').send({ groupId: '12' }).expect(400)

        expect(createGroupMembershipFromInvitation).not.toHaveBeenCalled()
    })
})
