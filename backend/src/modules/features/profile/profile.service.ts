import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator.js'
import { InvitationWithExtraData } from '../../../common/types/invitation.type.js'
import { DatabaseService } from '../../common/database/database.service.js'
import { GameProposalService } from '../../core/game-proposal/game-proposal.service.js'
import { GroupsService } from '../../core/groups/groups.service.js'
import { InvitationsService } from '../../core/invitations/invitations.service.js'
import { ActivityNotifier } from '../../core/notifications/activity-notifier.service.js'
import { NotificationsService } from '../../core/notifications/notifications.service.js'
import { UsersService } from '../../core/users/users.service.js'

import type { SuccessDto } from '../../../common/types/auth.type.js'
import type { CreateGameProposalBody, GameProposalDto } from '../../../common/types/game-proposal.type.js'
import type { NotificationDto } from '../../../common/types/notification.type.js'
import type { UserProposalStatsDto } from '../../../common/types/stats.type.js'
import type { UserSelfDto } from '../../../common/types/user.type.js'

@Injectable()
export class ProfileService {
    constructor(
        private readonly usersService: UsersService,
        private readonly notificationsService: NotificationsService,
        private readonly groupsService: GroupsService,
        private readonly invitationsService: InvitationsService,
        private readonly databaseService: DatabaseService,
        private readonly gameProposalService: GameProposalService,
        private readonly activityNotifier: ActivityNotifier,
    ) {}

    @LogFeature(new Logger('ProfileService'))
    async getUserById(id: number): Promise<UserSelfDto> {
        const user = await this.usersService.getUserById(id)

        return {
            id: user.id,
            email: user.email,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
            createdAt: user.createdAt,
        }
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

        if (this.invitationsService.isExpired(invitationData)) {
            throw new BadRequestException('This invitation has expired. Ask the group owner to send a new one.')
        }

        // Membership creation and invitation consumption must commit together.
        await this.databaseService.invitations.acceptInvitationAtomically(invitationId, userId, invitationData.groupId)
        await this.activityNotifier.memberJoined(invitationData.groupId, userId)

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
