import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CreateGroupBody, GroupDto, UpdateGroupBody } from '../../common/types/shared/group.type'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GroupsService } from './groups.service'
import { GroupWithMembers } from 'src/common/types/shared/group-with-members.type'

@UseGuards(JwtAuthGuard)
@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
    constructor(private readonly groupsService: GroupsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all groups' })
    @ApiResponse({ status: 200, type: [GroupDto], description: 'List of all groups' })
    async getGroups() {
        return this.groupsService.getGroups()
    }

    @Get('/:groupId')
    @ApiOperation({ summary: 'Get group by id' })
    @ApiResponse({ status: 200, type: GroupDto, description: 'Group found' })
    @ApiResponse({ status: 404, description: 'Group not found' })
    @ApiParam({ name: 'groupId', type: String })
    getGroupById(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupsService.getGroupById(groupId)
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new group' })
    @ApiResponse({ status: 201, description: 'The group has been succesfully created' })
    async createGroup(@Body() groupBody: CreateGroupBody) {
        return this.groupsService.createGroup(groupBody)
    }

    @Put('/:groupId')
    @ApiOperation({ summary: 'Update a group by ID' })
    @ApiParam({ name: 'groupId', required: true, description: 'Group ID' })
    @ApiBody({ type: UpdateGroupBody, description: 'Partial or full group object to update' })
    @ApiResponse({ status: 200, description: 'The group has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'Group not found.' })
    updateGroup(@Param('groupId', ParseIntPipe) groupId: number, @Body() partialGroupDto: UpdateGroupBody) {
        return this.groupsService.updateGroup(groupId, partialGroupDto)
    }

    @Delete('/:groupId')
    @ApiOperation({ summary: 'Delete a group by Id' })
    @ApiResponse({ status: 200, description: 'The group has been succesfully deleted' })
    @ApiParam({ name: 'groupId', type: String, description: 'ID of the group to be deleted' })
    async deleteGroupById(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupsService.deleteGroupById(groupId)
    }

    @Get('/:groupId/members')
    @ApiOperation({ summary: 'Get all group members' })
    @ApiResponse({ status: 200, type: [GroupWithMembers] })
    @ApiParam({ name: 'groupId', type: String })
    getGroupMembers(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupsService.getGroupMembers(groupId)
    }
}
