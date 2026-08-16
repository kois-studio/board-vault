import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { GroupOwnerGuard } from '../../../common/guards/group-owner.guard'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { UserInGroupGuard } from '../../../common/guards/user-in-group.guard'
import { CreateGroupRequestBody, GroupDto, UpdateGroupBody } from '../../../common/types/group.type'
import { InvitationWithAccountsData } from '../../../common/types/invitation.type'

import { GroupsService } from './groups.service'

@UseGuards(JwtAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all groups', deprecated: true })
    @ApiResponse({ status: 200, type: [GroupDto], description: 'List of all groups' })
    async getGroups(@Req() request: { user: { userId: number } }) {
        return this.groupsService.getGroupsForAccount(request.user.userId)
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new group', deprecated: true })
    @ApiResponse({ status: 201, description: 'The group has been succesfully created' })
    async createGroup(@Req() request: { user: { userId: number } }, @Body() groupBody: CreateGroupRequestBody) {
        return this.groupsService.createGroup({ ...groupBody, createdBy: request.user.userId })
    }

    @UseGuards(UserInGroupGuard)
    @Get('/:groupId')
    @ApiOperation({ summary: 'Get group by id', deprecated: true })
    @ApiResponse({ status: 200, type: GroupDto, description: 'Group found' })
    @ApiResponse({ status: 404, description: 'Group not found' })
    getGroupById(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupsService.getGroupById(groupId)
    }

    @UseGuards(GroupOwnerGuard)
    @Put('/:groupId')
    @ApiOperation({ summary: 'Update a group by ID', deprecated: true })
    @ApiResponse({ status: 200, description: 'The group has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'Group not found.' })
    updateGroup(@Param('groupId', ParseIntPipe) groupId: number, @Body() partialGroupDto: UpdateGroupBody) {
        return this.groupsService.updateGroup(groupId, partialGroupDto)
    }

    @UseGuards(GroupOwnerGuard)
    @Delete('/:groupId')
    @ApiOperation({ summary: 'Delete a group by Id', deprecated: true })
    @ApiResponse({ status: 200, description: 'The group has been succesfully deleted' })
    async deleteGroupById(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupsService.deleteGroupById(groupId)
    }

    @UseGuards(GroupOwnerGuard)
    @Get('/:groupId/invitations')
    @ApiOperation({ summary: 'Get pending invitations for a group (owner only)' })
    @ApiResponse({ status: 200, type: [InvitationWithAccountsData] })
    getGroupInvitations(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupsService.getGroupInvitations(groupId)
    }
}
