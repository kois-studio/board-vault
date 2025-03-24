import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { SuccessDto } from '../../../common/types/auth.type'
import { GroupWithMembersAndGames } from '../../../common/types/group.type'
import { MeetCreatedDto, MeetWithAttendeesAndGames } from '../../../common/types/meet.type'
import { UserStatsDto } from '../../../common/types/stats.type'

import { DashboardService } from './dashboard.service'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
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

    @Get('/users/:userId/groups')
    @ApiOperation({ summary: 'Get all groups of a user with members and games', deprecated: false })
    @ApiResponse({ status: 200, type: [GroupWithMembersAndGames], description: 'List of all groups of the user' })
    async getGroupsOfUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.dashboardService.getGroupsOfUser(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/users/:userId/groups/create/:groupName')
    @ApiOperation({ summary: 'Create a new group', deprecated: false })
    @ApiResponse({ status: 201, type: SuccessDto, description: 'Group created successfully' })
    async createGroup(@Param('userId', ParseIntPipe) userId: number, @Param('groupName') groupName: string) {
        return this.dashboardService.createGroup(userId, groupName)
    }

    @UseGuards(UserOwnershipGuard)
    @Delete('/users/:userId/groups/:groupId')
    @ApiOperation({ summary: 'Delete a group (owner only)', deprecated: false })
    @ApiResponse({ status: 204, description: 'Group deleted successfully' })
    async deleteGroup(@Param('userId', ParseIntPipe) userId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.dashboardService.deleteGroup(userId, groupId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/groups/:groupId/meetings')
    @ApiOperation({ summary: 'Get all meetings of a group', deprecated: false })
    @ApiResponse({ status: 200, type: [MeetWithAttendeesAndGames], description: 'Meetings retrieved successfully' })
    async getGroupMeetings(@Param('userId', ParseIntPipe) userId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.dashboardService.getGroupMeetings(userId, groupId)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/users/:userId/groups/:groupId/meetings')
    @ApiOperation({ summary: 'Create a new meeting', deprecated: false })
    @ApiResponse({ status: 201, type: MeetCreatedDto, description: 'Meeting created successfully' })
    async createMeeting(@Param('userId', ParseIntPipe) userId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.dashboardService.createMeeting(userId, groupId)
    }

    @UseGuards(UserOwnershipGuard)
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
