import { Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { InvitationWithExtraData } from '../../../common/types/invitation.type'
import { GroupMembershipsService } from '../../core/group-memberships/group-memberships.service'
import { GroupsService } from '../../core/groups/groups.service'
import { InvitationsService } from '../../core/invitations/invitations.service'
import { NotificationsService } from '../../core/notifications/notifications.service'
import { UsersService } from '../../core/users/users.service'

import type { SuccessDto } from '../../../common/types/auth.type'
import type { NotificationDto } from '../../../common/types/notification.type'
import type { UserGetDto } from '../../../common/types/user.type'

@Injectable()
export class ProfileService {
    constructor(
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService,
        private readonly groupsService: GroupsService,
        private readonly invitationsService: InvitationsService,
        private readonly groupMembershipsService: GroupMembershipsService,
    ) {}

    @LogFeature(new Logger('ProfileService'))
    async getUserByEmail(email: string): Promise<UserGetDto> {
        return this.usersService.getUserByEmail(email)
    }

    @LogFeature(new Logger('ProfileService'))
    async getNotificationsByAccountId(accountId: number): Promise<Array<NotificationDto>> {
        return this.notificationsService.getNotificationsByAccountId(accountId)
    }

    @LogFeature(new Logger('ProfileService'))
    async getUserInvitations(accountId: number): Promise<Array<InvitationWithExtraData>> {
        const invitations = await this.invitationsService.getUserInvitationsReceived(accountId)

        return Promise.all(
            invitations.map(async invitation => ({
                ...invitation,
                group: await this.groupsService.getGroupById(invitation.groupId),
                fromAccount: await this.usersService.getUserById(invitation.fromAccountId),
            })),
        )
    }

    @LogFeature(new Logger('ProfileService'))
    async acceptInvitation(userId: number, invitationId: number): Promise<SuccessDto> {
        // Step 1: get invitation data
        const invitationData = await this.invitationsService.getInvitationById(invitationId)

        // Step 2: get group data (it may have been deleted)
        const groupData = await this.groupsService.getGroupById(invitationData.groupId)

        // Step 3: create the membership to the group
        await this.groupMembershipsService.createGroupMembership({ accountId: invitationData.toAccountId, groupId: invitationData.groupId })

        // Step 4: delete the invitation
        await this.invitationsService.deleteInvitationById(invitationId)

        // Step 5: create the notification for the group owner
        const invited = await this.usersService.getUserById(invitationData.toAccountId)
        const owner = await this.usersService.getUserById(groupData.createdBy)

        // await this.notificationsService.createNotification({
        //     accountId: owner.id,
        //     type: NotificationTypeEnum.InvitationAccepted,
        //     message: `${invited.displayName} joined your group ${groupData.name}`,
        // })

        return { success: true }
    }
}
