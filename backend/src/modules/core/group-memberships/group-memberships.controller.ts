import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
import {
    CreateGroupMembershipBody,
    CreateGroupMembershipRequestBody,
    GroupMembershipDto,
} from '../../../common/types/group-membership.type'

import { GroupMembershipsService } from './group-memberships.service'

@UseGuards(JwtAuthGuard)
@ApiTags('memberships')
@ApiBearerAuth()
@Controller('memberships')
export class GroupMembershipsController {
    constructor(private readonly groupMembershipsService: GroupMembershipsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all memberships', deprecated: true })
    @ApiResponse({ status: 200, type: [GroupMembershipDto], description: 'List of all memberships' })
    async getGroupMemberships() {
        return this.groupMembershipsService.getGroupMemberships()
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new membership', deprecated: true })
    @ApiResponse({ status: 201, description: 'The membership has been succesfully created' })
    async createGroupMembership(@Req() request: { user: { userId: number } }, @Body() membershipDto: CreateGroupMembershipRequestBody) {
        return this.groupMembershipsService.createGroupMembership({
            ...membershipDto,
            accountId: request.user.userId,
        } as CreateGroupMembershipBody)
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
    @ApiOperation({ summary: 'Delete a membership by Id' })
    @ApiResponse({ status: 200, description: 'The membership has been succesfully deleted' })
    async deleteGroupMembershipById(@Param('accountId', ParseIntPipe) accountId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupMembershipsService.deleteGroupMembershipById(accountId, groupId)
    }
}
