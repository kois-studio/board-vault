import { Injectable, Logger } from '@nestjs/common'
import { LogFeature } from '../../../common/decorators/logger.decorator'
import { UsersService } from '../../users/users.service'
import { GroupsService } from '../../core/groups/groups.service'
import { GroupMembershipsService } from '../../core/group-memberships/group-memberships.service'
import { GamesOwnedService } from '../../core/games-owned/games-owned.service'
import { GamesService } from '../../core/games/games.service'
import { ReviewsService } from '../../core/reviews/reviews.service'
import type { GroupMemberWithGames, GroupWithMembersAndGames } from '../../../common/types/group.type'
import type { UserWithGames } from '../../../common/types/user.type'

@Injectable()
export class DashboardService {
    constructor(
        private readonly usersService: UsersService,
        private readonly groupsService: GroupsService,
        private readonly groupMembershipsService: GroupMembershipsService,
        private readonly gamesOwnedService: GamesOwnedService,
        private readonly gamesService: GamesService,
        private readonly reviewsService: ReviewsService,
    ) {}

    @LogFeature(new Logger('DashboardService'))
    async getGroupsOfUser(userId: number): Promise<Array<GroupWithMembersAndGames>> {
        const memberships = await this.groupMembershipsService.getGroupMembershipsByAccountId(userId)
        const groupsWithMembers = await Promise.all(memberships.map(async membership => {
            // the group data
            const group = await this.groupsService.getGroupById(membership.groupId)
            // the members of the group
            const _memberships = await this.groupMembershipsService.getGroupMembershipsByGroupId(membership.groupId)
            const members: Array<GroupMemberWithGames> = await Promise.all(_memberships.map(async _membership => {
                const user = await this.usersService.getUserById(_membership.accountId)
                const gamesOwned = await this.gamesOwnedService.getGamesOwnedByAccountId(_membership.accountId)
                const games = await Promise.all(gamesOwned.map(game => this.gamesService.getGameById(game.gameId)))

                const userWithGames: UserWithGames = { ...user, games }
                const userReviews = await this.reviewsService.getGameReviewsByAccountId(_membership.accountId)

                return {
                    ...userWithGames,
                    joinedAt: _membership.joinedAt,
                    reviews: userReviews,
                }
            }))

            return { ...group, members }
        }))

        return groupsWithMembers
    }

    @LogFeature(new Logger('DashboardService'))
    async createGroup(userId: number, groupName: string): Promise<{ success: boolean }> {
        // Step 1: Create group
        await this.groupsService.createGroup({
            name: groupName,
            createdBy: userId,
        })

        // Step 2: Get groupId
        const groupData = await this.groupsService.getGroupByName(groupName)

        // Step 3: Create the owner<->group membership
        await this.groupMembershipsService.createGroupMembership({
            accountId: userData.id,
            groupId: groupData.id,
        })

        return { success: true }
    }
}
