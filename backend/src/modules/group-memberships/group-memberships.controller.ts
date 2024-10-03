import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GroupMembershipsService } from './group-memberships.service'
import { CreateGroupMembershipBody, GroupMembershipDto } from 'src/common/types/shared/group-membership.type'

@UseGuards(JwtAuthGuard)
@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class GroupMembershipsController {
    constructor(private readonly groupMembershipsService: GroupMembershipsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all users' })
    @ApiResponse({ status: 200, type: [GroupMembershipDto], description: 'List of all users' })
    async getGroupMemberships() {
        return this.groupMembershipsService.getGroupMemberships()
    }

    @Get('/:accountId/:groupId')
    @ApiOperation({ summary: 'Get user by id' })
    @ApiResponse({ status: 200, type: GroupMembershipDto, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    @ApiParam({ name: 'accountId', type: String })
    @ApiParam({ name: 'groupId', type: String })
    getGroupMembershipById(@Param('accountId', ParseIntPipe) accountId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupMembershipsService.getGroupMembershipById(accountId, groupId)
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new user' })
    @ApiResponse({ status: 201, description: 'The user has been succesfully created' })
    async createGroupMembership(@Body() userDto: CreateGroupMembershipBody) {
        return this.groupMembershipsService.createGroupMembership(userDto)
    }

    @Delete('/:accountId/:groupId')
    @ApiOperation({ summary: 'Delete a user by Id' })
    @ApiResponse({ status: 200, description: 'The user has been succesfully deleted' })
    @ApiParam({ name: 'accountId', type: String })
    @ApiParam({ name: 'groupId', type: String })
    async deleteGroupMembershipById(@Param('accountId', ParseIntPipe) accountId: number, @Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupMembershipsService.deleteGroupMembershipById(accountId, groupId)
    }
}
