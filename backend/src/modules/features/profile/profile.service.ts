import { Injectable, Logger } from '@nestjs/common'
import { LogFeature } from '../../../common/decorators/logger.decorator'
import { UsersService } from '../../users/users.service'
import { NotificationsService } from '../../core/notifications/notifications.service'
import type { UserGetDto } from '../../../common/types/user.type'
import type { NotificationDto } from '../../../common/types/notification.type'
import { InvitationWithExtraData } from '../../../common/types/invitation.type'
import { InvitationsService } from '../../invitations/invitations.service'
import { GroupsService } from '../../groups/groups.service'

@Injectable()
export class ProfileService {
    constructor(
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService,
        private readonly groupsService: GroupsService,
        private readonly invitationsService: InvitationsService,
    ) {}

    @LogFeature(new Logger('ProfileService'))
    async getUserByEmail(email: string): Promise<UserGetDto> {
        return this.usersService.getUserByEmail(email)
    }

    @LogFeature(new Logger('ProfileService'))
    async getNotificationsByAccountId(accountId: number): Promise<Array<NotificationDto>> {
        return this.notificationsService.getNotificationsByAccountId(accountId)
    }

    async getUserInvitationsReceived(accountId: number): Promise<Array<InvitationWithExtraData>> {
        const invitations = await this.invitationsService.getUserInvitationsReceived(accountId)
        return Promise.all(
            invitations.map(async invitation => ({
                ...invitation,
                group: await this.groupsService.getGroupById(invitation.groupId),
                fromAccount: await this.usersService.getUserById(invitation.fromAccountId),
            })),
        )
    }
}
