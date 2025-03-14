import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { CreateGroupBody, GroupDto, GroupWithMembersAndGames, UpdateGroupBody } from '../../../common/types/group.type'
import { InvitationWithAccountsData } from '../../../common/types/invitation.type'
import { MeetWithAttendeesAndGames } from '../../../common/types/meet.type'

import { GroupsService } from './groups.service'

@UseGuards(JwtAuthGuard)
@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all groups', deprecated: true })
    @ApiResponse({ status: 200, type: [GroupDto], description: 'List of all groups' })
    async getGroups() {
        return this.groupsService.getGroups()
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new group', deprecated: true })
    @ApiResponse({ status: 201, description: 'The group has been succesfully created' })
    async createGroup(@Body() groupBody: CreateGroupBody) {
        return this.groupsService.createGroup(groupBody)
    }

    @Get('/:groupId')
    @ApiOperation({ summary: 'Get group by id', deprecated: true })
    @ApiResponse({ status: 200, type: GroupDto, description: 'Group found' })
    @ApiResponse({ status: 404, description: 'Group not found' })
    getGroupById(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupsService.getGroupById(groupId)
    }

    @Put('/:groupId')
    @ApiOperation({ summary: 'Update a group by ID', deprecated: true })
    @ApiResponse({ status: 200, description: 'The group has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'Group not found.' })
    updateGroup(@Param('groupId', ParseIntPipe) groupId: number, @Body() partialGroupDto: UpdateGroupBody) {
        return this.groupsService.updateGroup(groupId, partialGroupDto)
    }

    @Delete('/:groupId')
    @ApiOperation({ summary: 'Delete a group by Id', deprecated: true })
    @ApiResponse({ status: 200, description: 'The group has been succesfully deleted' })
    async deleteGroupById(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupsService.deleteGroupById(groupId)
    }

    @Get('/:groupId/invitations')
    @ApiOperation({ summary: 'Get all group invitations' })
    @ApiResponse({ status: 200, type: [InvitationWithAccountsData] })
    getGroupInvitations(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupsService.getGroupInvitations(groupId)
    }

    @Get('/:groupId/meetings')
    @ApiOperation({ summary: 'Get all group meetings' })
    @ApiResponse({ status: 200, type: [MeetWithAttendeesAndGames] })
    getGroupMeetings(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupsService.getGroupMeetings(groupId)
    }
}
