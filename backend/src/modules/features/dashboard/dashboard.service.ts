import { BadRequestException, ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator.js'
import { groupBy } from '../../../common/utils/group-by.js'
import { DatabaseService } from '../../common/database/database.service.js'
import { GameTranslationService } from '../../core/game-translation/game-translation.service.js'
import { GamesService } from '../../core/games/games.service.js'
import { GamesOwnedService } from '../../core/games-owned/games-owned.service.js'
import { GroupMembershipsService } from '../../core/group-memberships/group-memberships.service.js'
import { GroupsService } from '../../core/groups/groups.service.js'
import { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service.js'
import { MeetsService } from '../../core/meets/meets.service.js'
import { ActivityNotifier } from '../../core/notifications/activity-notifier.service.js'
import { ReviewsService } from '../../core/reviews/reviews.service.js'
import { UsersService } from '../../core/users/users.service.js'
import { buildHistoryRecords, parseAvatar } from '../play/history-records.js'

import type { Locale } from '../../../common/i18n/locale.js'
import type { SuccessDto } from '../../../common/types/auth.type.js'
import type { GameCompleteDto } from '../../../common/types/game.type.js'
import type {
    CreatedGroupDto,
    GroupDto,
    GroupMemberWithGames,
    GroupOverviewDto,
    GroupShelfDto,
    GroupWithMembersAndGames,
} from '../../../common/types/group.type.js'
import type { UserStatsDto } from '../../../common/types/stats.type.js'
import type { UserPublicDto, UserPublicWithGames } from '../../../common/types/user.type.js'
import type { HistoryRecordDto } from '../play/play.types.js'

/** A group as loaded once for the overview, the shelf and the deprecated full shape: games as ids only. */
type LoadedGroup = {
    group: GroupDto
    members: Array<{ accountId: number; user: UserPublicDto; joinedAt: string; gameIds: Array<number> }>
    placeholders: Array<{ id: number; displayName: string; avatar: ReturnType<typeof parseAvatar>; gameIds: Array<number> }>
}

@Injectable()
export class DashboardService {
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
        private readonly activityNotifier: ActivityNotifier,
    ) {}

    @LogFeature(new Logger('DashboardService'))
    async getStatsOfUser(userId: number): Promise<UserStatsDto> {
        const gamesOwned = await this.gamesOwnedService.getGamesOwnedByAccountId(userId)
        const totalGamesValue = gamesOwned.reduce((acc, game) => acc + (game.purchasePrice ?? 0), 0)

        return {
            totalGamesValue,
        }
    }

    /**
     * Every group of the user with every member's games and reviews. Deprecated (#262): it grows with everyone's
     * collection. Kept for the previous frontend release while both deploy (docs/api.md, Compatibility); use
     * `getGroupOverviewsOfUser` and `getGroupShelf`.
     */
    @LogFeature(new Logger('DashboardService'))
    async getGroupsOfUser(userId: number, locale: Locale): Promise<Array<GroupWithMembersAndGames>> {
        return this.groupsWithMembersAndGames(await this.groupIdsOfUser(userId), locale)
    }

    /**
     * One of the user's groups, shaped like an entry of `getGroupsOfUser`, for a page about that group: a session
     * page needs its own group, not every group with every member's games and reviews (#258). The route's guards
     * check that the caller is the user and a member. Deprecated with `getGroupsOfUser` (#262).
     */
    @LogFeature(new Logger('DashboardService'))
    async getGroupOfUser(groupId: number, locale: Locale): Promise<GroupWithMembersAndGames> {
        const [group] = await this.groupsWithMembersAndGames([groupId], locale)

        if (!group) throw new NotFoundException(`Group with id ${groupId} not found`)

        return group
    }

    /** The user's groups with their people and counts, the same size however many games anyone owns (#262). */
    @LogFeature(new Logger('DashboardService'))
    async getGroupOverviewsOfUser(userId: number): Promise<Array<GroupOverviewDto>> {
        return this.groupOverviews(await this.groupIdsOfUser(userId))
    }

    /** One of the user's groups, as in `getGroupOverviewsOfUser`. The route's guards check the caller is a member. */
    @LogFeature(new Logger('DashboardService'))
    async getGroupOverviewOfUser(groupId: number): Promise<GroupOverviewDto> {
        const [group] = await this.groupOverviews([groupId])

        if (!group) throw new NotFoundException(`Group with id ${groupId} not found`)

        return group
    }

    /**
     * A group's games, once each, who owns them, and the members' ratings, for a page about the group (#262). The
     * route's guards check the caller is a member.
     */
    @LogFeature(new Logger('DashboardService'))
    async getGroupShelf(groupId: number, locale: Locale): Promise<GroupShelfDto> {
        const [loaded] = await this.loadGroups([groupId])

        if (!loaded) throw new NotFoundException(`Group with id ${groupId} not found`)

        const owners = [
            ...loaded.members.map(member => ({ accountId: member.accountId, groupPersonId: null, gameIds: member.gameIds })),
            ...loaded.placeholders.map(person => ({ accountId: null, groupPersonId: person.id, gameIds: person.gameIds })),
        ]
        const gameIds = [...new Set(owners.flatMap(owner => owner.gameIds))]
        const [games, reviews] = await Promise.all([
            this.completeGamesByIds(gameIds, locale),
            this.reviewsService.getGameReviewsByAccountIds(loaded.members.map(member => member.accountId)),
        ])

        return {
            games: [...games.values()].sort((a, b) => a.title.localeCompare(b.title, locale)),
            owners,
            reviews,
        }
    }

    private async groupIdsOfUser(userId: number): Promise<Array<number>> {
        const memberships = await this.groupMembershipsService.getGroupMembershipsByAccountId(userId)

        return memberships.map(membership => membership.groupId)
    }

    /**
     * Groups with their members, their people without an account and the games each owns, as ids, in a fixed
     * number of set-based queries however many groups, people and games there are (#251, #262). Groups keep the
     * order asked for; one that no longer exists is left out.
     */
    private async loadGroups(groupIds: Array<number>): Promise<Array<LoadedGroup>> {
        const ids = [...new Set(groupIds)]

        if (ids.length === 0) return []

        const [groups, memberships, placeholderRows, ownershipRows] = await Promise.all([
            this.groupsService.getGroupsByIds(ids),
            this.groupMembershipsService.getGroupMembershipsByGroupIds(ids),
            this.databaseService.groups.getActivePlaceholdersByGroupIds(ids),
            this.databaseService.groups.getAssertedOwnershipByGroupIds(ids),
        ])
        const memberIds = [...new Set(memberships.map(membership => membership.accountId))]
        const [users, owned] = await Promise.all([
            this.usersService.getPublicUsersByIds(memberIds),
            this.gamesOwnedService.getGamesOwnedByAccountIds(memberIds),
        ])
        // Each list read once, not once per group (#289).
        const membershipsByGroup = groupBy(memberships, membership => membership.groupId)
        const placeholdersByGroup = groupBy(placeholderRows.rows, row => Number(row.groupId))
        const gamesByAccount = groupBy(
            owned,
            item => item.accountId,
            item => item.gameId,
        )
        const gamesByPerson = groupBy(
            ownershipRows.rows,
            row => Number(row.groupPersonId),
            row => Number(row.gameId),
        )

        return ids.flatMap(groupId => {
            const group = groups.get(groupId)

            if (!group) return []

            return [
                {
                    group,
                    members: (membershipsByGroup.get(groupId) ?? [])
                        .filter(membership => users.has(membership.accountId))
                        .map(membership => ({
                            accountId: membership.accountId,
                            user: users.get(membership.accountId)!,
                            joinedAt: membership.joinedAt,
                            gameIds: gamesByAccount.get(membership.accountId) ?? [],
                        })),
                    placeholders: (placeholdersByGroup.get(groupId) ?? []).map(row => ({
                        id: Number(row.id),
                        displayName: String(row.displayName),
                        avatar: parseAvatar(row.avatar),
                        gameIds: gamesByPerson.get(Number(row.id)) ?? [],
                    })),
                },
            ]
        })
    }

    private async groupOverviews(groupIds: Array<number>): Promise<Array<GroupOverviewDto>> {
        return (await this.loadGroups(groupIds)).map(({ group, members, placeholders }) => ({
            ...group,
            gameCount: new Set([...members, ...placeholders].flatMap(owner => owner.gameIds)).size,
            members: members.map(member => ({ ...member.user, joinedAt: member.joinedAt, gameCount: member.gameIds.length })),
            placeholders: placeholders.map(({ gameIds, ...person }) => ({ ...person, gameCount: gameIds.length })),
        }))
    }

    private async groupsWithMembersAndGames(groupIds: Array<number>, locale: Locale): Promise<Array<GroupWithMembersAndGames>> {
        const loaded = await this.loadGroups(groupIds)
        const memberIds = [...new Set(loaded.flatMap(entry => entry.members.map(member => member.accountId)))]
        const gameIds = [...new Set(loaded.flatMap(entry => [...entry.members, ...entry.placeholders].flatMap(owner => owner.gameIds)))]
        const [games, reviews] = await Promise.all([
            this.completeGamesByIds(gameIds, locale),
            this.reviewsService.getGameReviewsByAccountIds(memberIds),
        ])
        const completeGames = (ids: Array<number>) => ids.map(id => games.get(id)).filter(game => game !== undefined)
        const reviewsByAccount = groupBy(reviews, review => review.accountId)

        return loaded.map(({ group, members, placeholders }) => ({
            ...group,
            placeholders: placeholders.map(person => ({ ...person, games: completeGames(person.gameIds) })),
            members: members.map(member => {
                const userWithGames: UserPublicWithGames = { ...member.user, games: completeGames(member.gameIds) }

                return {
                    ...userWithGames,
                    joinedAt: member.joinedAt,
                    reviews: reviewsByAccount.get(member.accountId) ?? [],
                } satisfies GroupMemberWithGames
            }),
        }))
    }

    /** Games with their titles in the reader's language, keyed by id. */
    private async completeGamesByIds(gameIds: Array<number>, locale: Locale): Promise<Map<number, GameCompleteDto>> {
        if (gameIds.length === 0) return new Map()

        const games = await this.gameTranslationService.withTitles([...(await this.gamesService.getGamesByIds(gameIds)).values()], locale)

        return new Map(games.map(game => [game.id, game]))
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
    async getGroupMeetings(_userId: number, groupId: number, locale: Locale): Promise<Array<HistoryRecordDto>> {
        const groupMeetings = (await this.meetsService.getMeetsByGroupId(groupId)).filter(meet => meet.status === 'completed')

        return buildHistoryRecords(groupMeetings, {
            databaseService: this.databaseService,
            gamesService: this.gamesService,
            gameTranslationService: this.gameTranslationService,
            usersService: this.usersService,
            locale,
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

        // Step 2: Leave: upcoming sessions drop them, history keeps them (ADR-0018)
        const { left } = await this.databaseService.groups.leaveGroup(userId, groupId, {
            groupId,
            actorAccountId: userId,
            type: 'member_left',
        })

        // Step 3: The members still in the group hear it
        if (left) await this.activityNotifier.memberLeft(groupId, userId, userId)

        return { success: true }
    }

    @LogFeature(new Logger('DashboardService'))
    async removeMemberFromGroup(userId: number, groupId: number, memberId: number): Promise<SuccessDto> {
        // Step 1: Check if user is owner
        const groupData = await this.groupsService.getGroupById(groupId)

        if (groupData.createdBy !== userId) {
            throw new ForbiddenException('You are not the owner of this group')
        }

        if (memberId === userId) {
            throw new BadRequestException('Owner cannot leave group')
        }

        // Step 2: Same as leaving: upcoming sessions drop them, history keeps them (ADR-0018)
        const { left } = await this.databaseService.groups.leaveGroup(memberId, groupId, {
            groupId,
            actorAccountId: userId,
            type: 'member_removed',
            subjectAccountId: memberId,
        })

        // Step 3: The members still in the group hear it
        if (left) await this.activityNotifier.memberLeft(groupId, memberId, userId)

        return { success: true }
    }
}
