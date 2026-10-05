import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard.js'
import { UserInGroupGuard } from '../../../common/guards/user-in-group.guard.js'
import { CreatedGroupDto, GroupWithMembersAndGames, LegacyCreateGroupParams } from '../../../common/types/group.type.js'
import { UserStatsDto } from '../../../common/types/stats.type.js'
import { HistoryRecordDto } from '../play/play.types.js'

import { DashboardService } from './dashboard.service.js'

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

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/groups')
    @ApiOperation({ summary: 'Get all groups of a user with members and games', deprecated: false })
    @ApiResponse({ status: 200, type: [GroupWithMembersAndGames], description: 'List of all groups of the user' })
    async getGroupsOfUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.dashboardService.getGroupsOfUser(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/users/:userId/groups/create/:groupName')
    @ApiOperation({ summary: 'Create a new group', deprecated: false })
    @ApiResponse({ status: 201, type: CreatedGroupDto, description: 'Group created successfully' })
    async createGroup(@Param() params: LegacyCreateGroupParams) {
        return this.dashboardService.createGroup(params.userId, params.groupName)
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
    async getGroupMeetings(@Param('userId', ParseIntPipe) userId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.dashboardService.getGroupMeetings(userId, groupId)
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
