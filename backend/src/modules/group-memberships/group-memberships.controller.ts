import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GroupMembershipsService } from './group-memberships.service'
import { CreateGroupMembershipBody, GroupMembershipDto } from '../../common/types/shared/group-membership.type'

@UseGuards(JwtAuthGuard)
@ApiTags('memberships')
@ApiBearerAuth()
@Controller('memberships')
export class GroupMembershipsController {
    constructor(private readonly groupMembershipsService: GroupMembershipsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all memberships' })
    @ApiResponse({ status: 200, type: [GroupMembershipDto], description: 'List of all memberships' })
    async getGroupMemberships() {
        return this.groupMembershipsService.getGroupMemberships()
    }

    @Get('/:accountId/:groupId')
    @ApiOperation({ summary: 'Get membership by id' })
    @ApiResponse({ status: 200, type: GroupMembershipDto, description: 'Membership found' })
    @ApiResponse({ status: 404, description: 'Membership not found' })
    @ApiParam({ name: 'accountId', type: String })
    @ApiParam({ name: 'groupId', type: String })
    getGroupMembershipById(@Param('accountId', ParseIntPipe) accountId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupMembershipsService.getGroupMembershipById(accountId, groupId)
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new membership' })
    @ApiResponse({ status: 201, description: 'The membership has been succesfully created' })
    async createGroupMembership(@Body() membershipDto: CreateGroupMembershipBody) {
        return this.groupMembershipsService.createGroupMembership(membershipDto)
    }

    @Delete('/:accountId/:groupId')
    @ApiOperation({ summary: 'Delete a membership by Id' })
    @ApiResponse({ status: 200, description: 'The membership has been succesfully deleted' })
    @ApiParam({ name: 'accountId', type: String })
    @ApiParam({ name: 'groupId', type: String })
    async deleteGroupMembershipById(@Param('accountId', ParseIntPipe) accountId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupMembershipsService.deleteGroupMembershipById(accountId, groupId)
    }
}
