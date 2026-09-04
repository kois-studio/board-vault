import { ForbiddenException, Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { InvitationWithExtraData } from '../../../common/types/invitation.type'
import { GameProposalService } from '../../core/game-proposal/game-proposal.service'
import { GroupMembershipsService } from '../../core/group-memberships/group-memberships.service'
import { GroupsService } from '../../core/groups/groups.service'
import { InvitationsService } from '../../core/invitations/invitations.service'
import { NotificationsService } from '../../core/notifications/notifications.service'
import { UsersService } from '../../core/users/users.service'

import type { SuccessDto } from '../../../common/types/auth.type'
import type { CreateGameProposalBody, GameProposalDto } from '../../../common/types/game-proposal.type'
import type { NotificationDto } from '../../../common/types/notification.type'
import type { UserProposalStatsDto } from '../../../common/types/stats.type'
import type { UserGetDto } from '../../../common/types/user.type'

@Injectable()
export class ProfileService {
    constructor(
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService,
        private readonly groupsService: GroupsService,
        private readonly invitationsService: InvitationsService,
        private readonly groupMembershipsService: GroupMembershipsService,
        private readonly gameProposalService: GameProposalService,
    ) {}

    @LogFeature(new Logger('ProfileService'))
    async getUserById(id: number): Promise<UserGetDto> {
        return this.usersService.getUserById(id)
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
                fromAccount: await this.usersService.getPublicUserById(invitation.fromAccountId),
            })),
        )
    }

    @LogFeature(new Logger('ProfileService'))
    async acceptInvitation(userId: number, invitationId: number): Promise<SuccessDto> {
        // Step 1: get invitation data
        const invitationData = await this.invitationsService.getInvitationById(invitationId)

        if (invitationData.toAccountId !== userId) {
            throw new ForbiddenException('You are not the recipient of this invitation')
        }

        // Step 2: create the membership to the group
        await this.groupMembershipsService.createGroupMembership({ accountId: invitationData.toAccountId, groupId: invitationData.groupId })

        // Step 3: delete the invitation
        await this.invitationsService.deleteInvitationForRecipient(invitationId, userId)

        // Step 4: owner notifications are intentionally deferred until the
        // notification contract defines delivery and unread semantics.

        return { success: true }
    }

    @LogFeature(new Logger('ProfileService'))
    async getUserProposals(userId: number): Promise<Array<GameProposalDto>> {
        return this.gameProposalService.getGameProposalsBySubmitter(userId)
    }

    @LogFeature(new Logger('ProfileService'))
    async getUserProposalStats(userId: number): Promise<UserProposalStatsDto> {
        return this.gameProposalService.getUserProposalStats(userId)
    }

    @LogFeature(new Logger('ProfileService'))
    async createGameProposal(userId: number, proposalData: CreateGameProposalBody): Promise<GameProposalDto> {
        return this.gameProposalService.createGameProposal(userId, proposalData)
    }
}
