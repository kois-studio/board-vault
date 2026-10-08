import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard.js'
import { CreateGroupMembershipRequestBody, GroupMembershipDto } from '../../../common/types/group-membership.type.js'

import { GroupMembershipsService } from './group-memberships.service.js'

@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('memberships')
@ApiBearerAuth()
@Controller('memberships')
export class GroupMembershipsController {
    constructor(private readonly groupMembershipsService: GroupMembershipsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all memberships', deprecated: true })
    @ApiResponse({ status: 200, type: [GroupMembershipDto], description: 'List of all memberships' })
    async getGroupMemberships(@Req() request: { user: { userId: number } }) {
        return this.groupMembershipsService.getGroupMembershipsByAccountId(request.user.userId)
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new membership', deprecated: true })
    @ApiResponse({ status: 201, description: 'The membership has been succesfully created' })
    async createGroupMembership(@Req() request: { user: { userId: number } }, @Body() membershipDto: CreateGroupMembershipRequestBody) {
        return this.groupMembershipsService.createGroupMembershipFromInvitation(request.user.userId, membershipDto.groupId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/:accountId/:groupId')
    @ApiOperation({ summary: 'Get membership by id', deprecated: true })
    @ApiResponse({ status: 200, type: GroupMembershipDto, description: 'Membership found' })
    @ApiResponse({ status: 404, description: 'Membership not found' })
    getGroupMembershipById(@Param('accountId', ParseIntPipe) accountId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupMembershipsService.getGroupMembershipById(accountId, groupId)
    }

    @UseGuards(UserOwnershipGuard)
    @Delete('/:accountId/:groupId')
    @ApiOperation({
        summary: 'Leave a group, as DELETE /dashboard/users/:userId/groups/:groupId/members does',
        deprecated: true,
    })
    @ApiResponse({ status: 200, description: 'Left the group: upcoming sessions drop you, history keeps you' })
    @ApiResponse({ status: 400, description: 'The owner cannot leave the group' })
    @ApiResponse({ status: 404, description: 'Membership not found' })
    async deleteGroupMembershipById(@Param('accountId', ParseIntPipe) accountId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupMembershipsService.deleteGroupMembershipById(accountId, groupId)
    }
}
