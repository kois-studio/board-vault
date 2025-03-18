import { BadRequestException, ForbiddenException, Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { GamesService } from '../../core/games/games.service'
import { GamesOwnedService } from '../../core/games-owned/games-owned.service'
import { GroupMembershipsService } from '../../core/group-memberships/group-memberships.service'
import { GroupsService } from '../../core/groups/groups.service'
import { MeetsService } from '../../core/meets/meets.service'
import { ReviewsService } from '../../core/reviews/reviews.service'
import { UsersService } from '../../core/users/users.service'

import type { SuccessDto } from '../../../common/types/auth.type'
import type { GroupMemberWithGames, GroupWithMembersAndGames } from '../../../common/types/group.type'
import type { MeetCreatedDto, MeetWithAttendeesAndGames } from '../../../common/types/meet.type'
import type { UserWithGames } from '../../../common/types/user.type'
import { MeetAccountGamesService } from 'src/modules/core/meet-account-games/meet-account-games.service'

@Injectable()
export class DashboardService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(
        private readonly usersService: UsersService,
        private readonly groupsService: GroupsService,
        private readonly groupMembershipsService: GroupMembershipsService,
        private readonly gamesOwnedService: GamesOwnedService,
        private readonly gamesService: GamesService,
        private readonly reviewsService: ReviewsService,
        private readonly meetsService: MeetsService,
        private readonly meetAccountGamesService: MeetAccountGamesService,
    ) {}

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
                    }),
                )

                return { ...group, members }
            }),
        )

        return groupsWithMembers
    }

    @LogFeature(new Logger('DashboardService'))
    async createGroup(userId: number, groupName: string): Promise<SuccessDto> {
        // Step 1: Create group
        await this.groupsService.createGroup({
            name: groupName,
            createdBy: userId,
        })

        // Step 2: Get groupId
        const groupData = await this.groupsService.getGroupByName(groupName)

        // Step 3: Create the owner<->group membership
        await this.groupMembershipsService.createGroupMembership({
            accountId: userId,
            groupId: groupData.id,
        })

        return { success: true }
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

    async getGroupMeetings(userId: number, groupId: number): Promise<Array<MeetWithAttendeesAndGames>> {
        this.LOGGER.log(`Validated that user ${userId} is in group ${groupId}`)
        const meetings = await this.meetsService.getMeetsByGroupId(groupId)

        return await Promise.all(
            meetings.map(async meeting => {
                const attendeesIds = await this.meetAccountGamesService.getDistinctAccountIdsByMeetId(meeting.id)
                const playedGamesIds = await this.meetAccountGamesService.getDistinctGameIdsByMeetId(meeting.id)

                return {
                    ...meeting,
                    attendees: attendeesIds,
                    playedGames: playedGamesIds,
                }
            }),
        )
    }

    @LogFeature(new Logger('DashboardService'))
    async createMeeting(userId: number, groupId: number): Promise<MeetCreatedDto> {
        // Step 1: Get group data
        const groupData = await this.groupsService.getGroupById(groupId)

        // Step 2: Create meeting
        const meetCreatedDto = await this.meetsService.createMeeting(groupData.id, userId)

        // Step 3: Notify all members of the group
        // TODO:
        // await this.databaseService.notifyGroupMembers(groupId, 'Meeting created')
        return meetCreatedDto
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
}
