import { Injectable, Logger } from '@nestjs/common'
import { LogFeature } from '../../../common/decorators/logger.decorator'
import { UsersService } from '../../users/users.service'
import type { GroupMemberWithGames, GroupWithMembersAndGames } from 'src/common/types/group.type'
import { GroupsService } from 'src/modules/groups/groups.service'
import { GroupMembershipsService } from 'src/modules/core/group-memberships/group-memberships.service'
import { UserWithGames } from 'src/common/types/user.type'
import { GamesOwnedService } from 'src/modules/core/games-owned/games-owned.service'
import { GamesService } from 'src/modules/core/games/games.service'
import { ReviewsService } from 'src/modules/core/reviews/reviews.service'

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
}
