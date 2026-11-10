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

import type { Locale } from '../../../common/i18n/locale.js'
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
            locale: user.locale,
        }
    }

    @LogFeature(new Logger('ProfileService'))
    async getNotificationsByAccountId(accountId: number, locale: Locale): Promise<Array<NotificationDto>> {
        return this.notificationsService.getInbox(accountId, locale)
    }

    @LogFeature(new Logger('ProfileService'))
    async getUserInvitations(accountId: number): Promise<Array<InvitationWithExtraData>> {
        const invitations = await this.invitationsService.getUserInvitationsReceived(accountId)
        // Polled every minute: the groups and senders of every invitation in two queries, not two per invitation (#251).
        const [groups, senders] = await Promise.all([
            this.groupsService.getGroupsByIds(invitations.map(invitation => invitation.groupId)),
            this.usersService.getPublicUsersByIds(invitations.map(invitation => invitation.fromAccountId)),
        ])

        return invitations.flatMap(invitation => {
            const group = groups.get(invitation.groupId)
            const fromAccount = senders.get(invitation.fromAccountId)

            // A group or sender that is gone hides its invitation instead of failing the whole inbox.
            return group && fromAccount ? [{ ...invitation, group, fromAccount }] : []
        })
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
        const { joined } = await this.databaseService.invitations.acceptInvitationAtomically(invitationId, userId, invitationData.groupId)

        // Someone who was already in the group is not news to it.
        if (joined) await this.activityNotifier.memberJoined(invitationData.groupId, userId)

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
    async createGameProposal(userId: number, proposalData: CreateGameProposalBody, locale: Locale): Promise<GameProposalDto> {
        return this.gameProposalService.createGameProposal(userId, proposalData, locale)
    }
}
