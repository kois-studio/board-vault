import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'
import { GameProposalService } from '../../core/game-proposal/game-proposal.service'
import { GameTranslationService } from '../../core/game-translation/game-translation.service'
import { GamesService } from '../../core/games/games.service'
import { GamesOwnedService } from '../../core/games-owned/games-owned.service'
import { GroupMembershipsService } from '../../core/group-memberships/group-memberships.service'
import { GroupsService } from '../../core/groups/groups.service'
import { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service'
import { MeetsService } from '../../core/meets/meets.service'
import { ReviewsService } from '../../core/reviews/reviews.service'
import { UsersService } from '../../core/users/users.service'
import { buildHistoryRecords, parseAvatar } from '../play/history-records'

import type { SuccessDto } from '../../../common/types/auth.type'
import type { CreatedGroupDto, GroupMemberWithGames, GroupWithMembersAndGames } from '../../../common/types/group.type'
import type { UserStatsDto, UserProposalStatsDto } from '../../../common/types/stats.type'
import type { UserPublicWithGames } from '../../../common/types/user.type'
import type { HistoryRecordDto } from '../play/play.types'

@Injectable()
export class DashboardService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly CACHE_KEY = 'user-proposal-stats'

    constructor(
        private readonly usersService: UsersService,
        private readonly databaseService: DatabaseService,
        private readonly groupsService: GroupsService,
        private readonly groupMembershipsService: GroupMembershipsService,
        private readonly gamesOwnedService: GamesOwnedService,
        private readonly gamesService: GamesService,
        private readonly reviewsService: ReviewsService,
        private readonly meetsService: MeetsService,
        private readonly gameTranslationService: GameTranslationService,
        private readonly meetAccountGamesService: MeetAccountGamesService,
        private readonly gameProposalService: GameProposalService,
        private readonly cacheService: CacheService,
    ) {}

    @LogFeature(new Logger('DashboardService'))
    async getStatsOfUser(userId: number): Promise<UserStatsDto> {
        const gamesOwned = await this.gamesOwnedService.getGamesOwnedByAccountId(userId)
        const totalGamesValue = gamesOwned.reduce((acc, game) => acc + (game.purchasePrice ?? 0), 0)

        return {
            totalGamesValue,
        }
    }

    @LogFeature(new Logger('DashboardService'))
    async getGroupsOfUser(userId: number): Promise<Array<GroupWithMembersAndGames>> {
        const memberships = await this.groupMembershipsService.getGroupMembershipsByAccountId(userId)
        const groups = await Promise.all(
            memberships.map(async membership => ({
                group: await this.groupsService.getGroupById(membership.groupId),
                memberships: await this.groupMembershipsService.getGroupMembershipsByGroupId(membership.groupId),
            })),
        )

        // Load every member, game, and translation once, in set-based queries,
        // instead of once per group, member, and game.
        const memberIds = [...new Set(groups.flatMap(entry => entry.memberships.map(item => item.accountId)))]
        const [users, ownedByMember, reviewsByMember] = await Promise.all([
            this.usersService.getPublicUsersByIds(memberIds),
            Promise.all(memberIds.map(async id => [id, await this.gamesOwnedService.getGamesOwnedByAccountId(id)] as const)).then(
                entries => new Map(entries),
            ),
            Promise.all(memberIds.map(async id => [id, await this.reviewsService.getGameReviewsByAccountId(id)] as const)).then(
                entries => new Map(entries),
            ),
        ])
        const gameIds = [...ownedByMember.values()].flat().map(owned => owned.gameId)
        const groupIds = groups.map(entry => entry.group.id)
        const [games, translations, placeholderRows, ownershipRows] = await Promise.all([
            this.gamesService.getGamesByIds(gameIds),
            this.gameTranslationService.getTranslationsByGameIds(gameIds),
            groupIds.length ? this.databaseService.groups.getActivePlaceholdersByGroupIds(groupIds) : { rows: [] },
            groupIds.length ? this.databaseService.groups.getAssertedOwnershipByGroupIds(groupIds) : { rows: [] },
        ])
        const gamesByPerson = new Map<number, Array<number>>()

        for (const row of ownershipRows.rows) {
            const personId = Number(row.groupPersonId)

            gamesByPerson.set(personId, [...(gamesByPerson.get(personId) ?? []), Number(row.gameId)])
        }
        const placeholders = placeholderRows.rows.map(row => ({
            groupId: Number(row.groupId),
            summary: {
                id: Number(row.id),
                displayName: String(row.displayName),
                avatar: parseAvatar(row.avatar),
                gameIds: gamesByPerson.get(Number(row.id)) ?? [],
            },
        }))

        return groups.map(({ group, memberships: groupMemberships }) => ({
            ...group,
            placeholders: placeholders.filter(item => item.groupId === group.id).map(item => item.summary),
            members: groupMemberships
                .filter(membership => users.has(membership.accountId))
                .map(membership => {
                    const ownedGames = (ownedByMember.get(membership.accountId) ?? [])
                        .map(owned => games.get(owned.gameId))
                        .filter(game => game !== undefined)
                        .map(game => ({ ...game, titleTranslations: translations.get(game.id) ?? { en: '', es: '' } }))
                    const userWithGames: UserPublicWithGames = { ...users.get(membership.accountId)!, games: ownedGames }

                    return {
                        ...userWithGames,
                        joinedAt: membership.joinedAt,
                        reviews: reviewsByMember.get(membership.accountId) ?? [],
                    } satisfies GroupMemberWithGames
                }),
        }))
    }

    @LogFeature(new Logger('DashboardService'))
    async createGroup(userId: number, groupName: string): Promise<CreatedGroupDto> {
        const { groupId } = await this.databaseService.groups.createGroupWithMembership({
            name: groupName,
            createdBy: userId,
        })

        return { success: true, groupId }
    }

    @LogFeature(new Logger('DashboardService'))
    async deleteGroup(userId: number, groupId: number): Promise<SuccessDto> {
        // Step 1: Get the group data
        const groupData = await this.groupsService.getGroupById(groupId)

        // Step 2: If the group is not owned by the user, throw an error
        if (groupData.createdBy !== userId) {
            throw new ForbiddenException('You are not the owner of this group')
        }

        // Step 3: If owner, then delete the group
        await this.groupsService.deleteGroupById(groupId)

        return { success: true }
    }

    @LogFeature(new Logger('DashboardService'))
    async getGroupMeetings(userId: number, groupId: number): Promise<Array<HistoryRecordDto>> {
        const groupMeetings = (await this.meetsService.getMeetsByGroupId(groupId)).filter(meet => meet.status === 'completed')

        return buildHistoryRecords(groupMeetings, {
            databaseService: this.databaseService,
            gamesService: this.gamesService,
            gameTranslationService: this.gameTranslationService,
            usersService: this.usersService,
            meetAccountGamesService: this.meetAccountGamesService,
        })
    }

    @LogFeature(new Logger('DashboardService'))
    async leaveGroup(userId: number, groupId: number): Promise<SuccessDto> {
        // Step 1: Check if user is owner
        const groupData = await this.groupsService.getGroupById(groupId)

        if (groupData.createdBy === userId) {
            throw new BadRequestException('Owner cannot leave group')
        }

        // Step 2: Delete the membership
        await this.groupMembershipsService.deleteGroupMembershipById(userId, groupId)

        return { success: true }
    }

    @LogFeature(new Logger('DashboardService'))
    async removeMemberFromGroup(userId: number, groupId: number, memberId: number): Promise<SuccessDto> {
        // Step 1: Check if user is owner
        const groupData = await this.groupsService.getGroupById(groupId)

        if (groupData.createdBy !== userId) {
            throw new ForbiddenException('You are not the owner of this group')
        }

        // Step 2: Delete the membership
        await this.groupMembershipsService.deleteGroupMembershipById(memberId, groupId)

        return { success: true }
    }

    // #region User Proposal Stats

    @LogFeature(new Logger('DashboardService'))
    async getUserProposalStats(userId: number): Promise<UserProposalStatsDto> {
        // Step 1: Try to get from cache first
        const cacheKey = `${this.CACHE_KEY}:${userId}`
        const cachedStats = await this.cacheService.get(cacheKey)

        if (cachedStats) {
            this.LOGGER.log('Returning cached proposal stats')
            return cachedStats
        }

        // Step 2: Calculate stats from database
        const allProposals = await this.gameProposalService.getGameProposalsBySubmitter(userId)

        const stats = this._calculateProposalStats(allProposals)

        // Step 3: Cache the results for 1 hour
        await this.cacheService.set(cacheKey, stats, 'short') // 1 hour cache

        return stats
    }

    private _calculateProposalStats(proposals: Array<any>): UserProposalStatsDto {
        const totalProposals = proposals.length
        const approvedProposals = proposals.filter(p => p.status === 'approved').length
        const rejectedProposals = proposals.filter(p => p.status === 'rejected').length
        const duplicateProposals = proposals.filter(p => p.status === 'duplicate').length
        const pendingProposals = proposals.filter(p => p.status === 'pending').length

        // Calculate approval rate (only for processed proposals)
        const processedProposals = approvedProposals + rejectedProposals + duplicateProposals
        const approvalRate =
            processedProposals > 0
                ? Math.round((approvedProposals / processedProposals) * 10000) / 100 // Round to 2 decimal places
                : 0

        // Calculate reputation score (0-100)
        // Formula: (approved * 10) + (rejected * -5) + (duplicate * -2) + (pending * 0)
        // Then normalize to 0-100 range
        const rawScore = approvedProposals * 10 + rejectedProposals * -5 + duplicateProposals * -2
        const reputationScore = Math.max(0, Math.min(100, Math.round(rawScore * 2))) // Scale and clamp to 0-100

        return {
            totalProposals,
            approvedProposals,
            rejectedProposals,
            duplicateProposals,
            pendingProposals,
            approvalRate,
            reputationScore,
        }
    }

    // #endregion
}
