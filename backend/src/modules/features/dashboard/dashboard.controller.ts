import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { RequestLocale } from '../../../common/decorators/request-locale.decorator.js'
import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard.js'
import { UserInGroupGuard } from '../../../common/guards/user-in-group.guard.js'
import {
    CreatedGroupDto,
    GroupOverviewDto,
    GroupShelfDto,
    GroupWithMembersAndGames,
    LegacyCreateGroupParams,
} from '../../../common/types/group.type.js'
import { UserStatsDto } from '../../../common/types/stats.type.js'
import { HistoryRecordDto } from '../play/play.types.js'

import { DashboardService } from './dashboard.service.js'

import type { Locale } from '../../../common/i18n/locale.js'

@UseGuards(AuthGuard)
@ApiTags('dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
    constructor(private readonly dashboardService: DashboardService) {}

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/stats')
    @ApiOperation({ summary: 'Get all stats of a user', deprecated: false })
    @ApiResponse({ status: 200, type: UserStatsDto, description: 'Stats retrieved successfully' })
    async getStatsOfUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.dashboardService.getStatsOfUser(userId)
    }

    // Kept as it was for the previous frontend release while both deploy (docs/api.md, Compatibility); remove it in a
    // later release, once no client reads it (#262).
    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/groups')
    @ApiOperation({
        summary:
            "Get all groups of a user with every member's games and reviews. Deprecated: use GET /dashboard/users/:userId/group-overviews and GET /dashboard/users/:userId/groups/:groupId/shelf (#262)",
        deprecated: true,
    })
    @ApiResponse({ status: 200, type: [GroupWithMembersAndGames], description: 'List of all groups of the user' })
    async getGroupsOfUser(@Param('userId', ParseIntPipe) userId: number, @RequestLocale() locale: Locale) {
        return this.dashboardService.getGroupsOfUser(userId, locale)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/users/:userId/groups/create/:groupName')
    @ApiOperation({ summary: 'Create a new group', deprecated: false })
    @ApiResponse({ status: 201, type: CreatedGroupDto, description: 'Group created successfully' })
    async createGroup(@Param() params: LegacyCreateGroupParams) {
        return this.dashboardService.createGroup(params.userId, params.groupName)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/group-overviews')
    @ApiOperation({ summary: 'Get all groups of a user with their people and how many games each brings (#262)' })
    @ApiResponse({ status: 200, type: [GroupOverviewDto], description: 'The groups of the user' })
    async getGroupOverviewsOfUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.dashboardService.getGroupOverviewsOfUser(userId)
    }

    @UseGuards(UserOwnershipGuard, UserInGroupGuard)
    @Get('/users/:userId/group-overviews/:groupId')
    @ApiOperation({ summary: 'Get one group of a user, as in the list of group overviews (#262)' })
    @ApiResponse({ status: 200, type: GroupOverviewDto, description: 'The group, with its people and their game counts' })
    @ApiResponse({ status: 403, description: 'Not this user, or not a member of the group.' })
    async getGroupOverviewOfUser(@Param('userId', ParseIntPipe) _userId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.dashboardService.getGroupOverviewOfUser(groupId)
    }

    @UseGuards(UserOwnershipGuard, UserInGroupGuard)
    @Get('/users/:userId/groups/:groupId/shelf')
    @ApiOperation({ summary: "Get a group's games once each, who owns them, and the members' ratings (#262)" })
    @ApiResponse({ status: 200, type: GroupShelfDto, description: "The group's games, owners and ratings" })
    @ApiResponse({ status: 403, description: 'Not this user, or not a member of the group.' })
    async getGroupShelf(
        @Param('userId', ParseIntPipe) _userId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
        @RequestLocale() locale: Locale,
    ) {
        return this.dashboardService.getGroupShelf(groupId, locale)
    }

    // Deprecated with GET /users/:userId/groups (#262); remove it in a later release, once no client reads it.
    @UseGuards(UserOwnershipGuard, UserInGroupGuard)
    @Get('/users/:userId/groups/:groupId')
    @ApiOperation({
        summary:
            'Get one group of a user with members and games, as in the list of all groups. Deprecated: use GET /dashboard/users/:userId/group-overviews/:groupId and GET /dashboard/users/:userId/groups/:groupId/shelf (#262)',
        deprecated: true,
    })
    @ApiResponse({ status: 200, type: GroupWithMembersAndGames, description: 'The group, with its members, their games and reviews' })
    @ApiResponse({ status: 403, description: 'Not this user, or not a member of the group.' })
    async getGroupOfUser(
        @Param('userId', ParseIntPipe) _userId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
        @RequestLocale() locale: Locale,
    ) {
        return this.dashboardService.getGroupOfUser(groupId, locale)
    }

    @UseGuards(UserOwnershipGuard, UserInGroupGuard)
    @Delete('/users/:userId/groups/:groupId')
    @ApiOperation({ summary: 'Delete a group (owner only)', deprecated: false })
    @ApiResponse({ status: 204, description: 'Group deleted successfully' })
    async deleteGroup(@Param('userId', ParseIntPipe) userId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.dashboardService.deleteGroup(userId, groupId)
    }

    @UseGuards(UserOwnershipGuard, UserInGroupGuard)
    @Get('/users/:userId/groups/:groupId/meetings')
    @ApiOperation({ summary: 'Get all meetings of a group', deprecated: false })
    @ApiResponse({ status: 200, type: [HistoryRecordDto], description: 'Meetings retrieved successfully' })
    async getGroupMeetings(
        @Param('userId', ParseIntPipe) userId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
        @RequestLocale() locale: Locale,
    ) {
        return this.dashboardService.getGroupMeetings(userId, groupId, locale)
    }

    @UseGuards(UserOwnershipGuard, UserInGroupGuard)
    @Delete('/users/:userId/groups/:groupId/members')
    @ApiOperation({ summary: 'Leaves a group', deprecated: false })
    @ApiResponse({ status: 204, description: 'Member left successfully' })
    async leaveGroup(@Param('userId', ParseIntPipe) userId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.dashboardService.leaveGroup(userId, groupId)
    }

    @UseGuards(UserOwnershipGuard)
    @Delete('/users/:userId/groups/:groupId/members/:memberId')
    @ApiOperation({ summary: 'Removes a member from a group', deprecated: false })
    @ApiResponse({ status: 204, description: 'Member removed successfully' })
    async deleteMemberFromGroup(
        @Param('userId', ParseIntPipe) userId: number,
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('memberId', ParseIntPipe) memberId: number,
    ) {
        return this.dashboardService.removeMemberFromGroup(userId, groupId, memberId)
    }
}
