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

import type { SuccessDto } from '../../../common/types/auth.type'
import type { CreatedGroupDto, GroupMemberWithGames, GroupWithMembersAndGames } from '../../../common/types/group.type'
import type { UserStatsDto, UserProposalStatsDto } from '../../../common/types/stats.type'
import type { UserPublicWithGames } from '../../../common/types/user.type'
import type { HistoryPersonDto, HistoryRecordDto } from '../play/play.types'

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
        const groupsWithMembers = await Promise.all(
            memberships.map(async membership => {
                // the group data
                const group = await this.groupsService.getGroupById(membership.groupId)
                // the members of the group
                const _memberships = await this.groupMembershipsService.getGroupMembershipsByGroupId(membership.groupId)
                const members: Array<GroupMemberWithGames> = await Promise.all(
                    _memberships.map(async _membership => {
                        const user = await this.usersService.getPublicUserById(_membership.accountId)
                        const gamesOwned = await this.gamesOwnedService.getGamesOwnedByAccountId(_membership.accountId)
                        const games = await Promise.all(gamesOwned.map(game => this.gamesService.getGameById(game.gameId)))
                        const gamesWithTranslations = await Promise.all(
                            games.map(async game => ({
                                ...game,
                                titleTranslations: await this.gameTranslationService.getGameTranslations(game.id),
                            })),
                        )

                        const userWithGames: UserPublicWithGames = { ...user, games: gamesWithTranslations }
                        const userReviews = await this.reviewsService.getGameReviewsByAccountId(_membership.accountId)

                        return {
                            ...userWithGames,
                            joinedAt: _membership.joinedAt,
                            reviews: userReviews,
                        }
                    }),
                )

                return { ...group, members }
            }),
        )

        return groupsWithMembers
    }

    @LogFeature(new Logger('DashboardService'))
    async createGroup(userId: number, groupName: string): Promise<CreatedGroupDto> {
        const { groupId } = await this.databaseService.createGroupWithMembership({
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

        return await Promise.all(
            groupMeetings.map(async meetData => {
                const attendedByIds = await this.databaseService.getMeetAttendedAccountIds(meetData.id)
                const attendedByPersonIds =
                    typeof this.databaseService.getMeetAttendedPersonIds === 'function'
                        ? await this.databaseService.getMeetAttendedPersonIds(meetData.id)
                        : []
                const groupPeople =
                    typeof this.databaseService.getGroupPeople === 'function'
                        ? await this.databaseService.getGroupPeople(groupId)
                        : { rows: [] }
                const peopleById = new Map(
                    groupPeople.rows.map(row => [
                        Number(row[0]),
                        { id: Number(row[0]), displayName: String(row[5]), avatar: this.parseAvatar(row[6]) },
                    ]),
                )
                const gameIds = await this.databaseService.getPlayedGameIdsByMeetId(meetData.id)
                const gamesPlayed = await Promise.all(
                    gameIds.map(async gameId => {
                        const game = await this.gamesService.getGameById(gameId)
                        const gameTranslations = await this.gameTranslationService.getGameTranslations(gameId)
                        const playedByIds = await this.meetAccountGamesService.getDistinctAccountIdsByMeetIdAndGameId(meetData.id, gameId)
                        const playedByPersonIds =
                            (typeof this.databaseService.getMeetPlayedGamePersonParticipants === 'function'
                                ? await this.databaseService.getMeetPlayedGamePersonParticipants(meetData.id)
                                : []
                            ).find(game => game.gameId === gameId)?.participantIds ?? []
                        const playedByData = await Promise.all(
                            playedByIds.map(async accountId => this.usersService.getPublicUserById(accountId)),
                        )

                        return {
                            gameData: {
                                ...game,
                                titleTranslations: gameTranslations,
                            },
                            playedBy: playedByData,
                            playedByPeople: playedByPersonIds
                                .map(personId => peopleById.get(personId))
                                .filter((person): person is HistoryPersonDto => person !== undefined),
                        }
                    }),
                )

                return {
                    meetData,
                    gamesPlayed,
                    attendedBy: await Promise.all(attendedByIds.map(async accountId => this.usersService.getPublicUserById(accountId))),
                    attendedByPeople: attendedByPersonIds
                        .map(personId => peopleById.get(personId))
                        .filter((person): person is HistoryPersonDto => person !== undefined),
                }
            }),
        )
    }

    private parseAvatar(value: unknown) {
        if (value === null || value === undefined || value === '') return null
        if (typeof value === 'object') return value
        try {
            return JSON.parse(String(value))
        } catch {
            return null
        }
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
