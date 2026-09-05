import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { GroupOwnerGuard } from '../../../common/guards/group-owner.guard'
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { UserInGroupGuard } from '../../../common/guards/user-in-group.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { ClerkGroupInvitationDto, CreateClerkGroupInvitationBody } from '../../../common/types/clerk-invitation.type'
import {
    GroupAcquisitionEntryDto,
    GroupGameInterestBody,
    UpdateGroupAcquisitionDecisionBody,
} from '../../../common/types/group-game-interest.type'
import { CreateGroupRequestBody, GroupDto, UpdateGroupBody } from '../../../common/types/group.type'
import { InvitationWithAccountsData } from '../../../common/types/invitation.type'
import { ClerkIdentityService } from '../../common/auth/clerk-identity.service'

import { GroupAcquisitionService } from './group-acquisition.service'
import { GroupsService } from './groups.service'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
    constructor(
        private readonly groupsService: GroupsService,
        private readonly groupAcquisitionService: GroupAcquisitionService,
        private readonly clerkIdentityService: ClerkIdentityService,
    ) {}

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

    @UseGuards(GroupOwnerGuard)
    @Post('/:groupId/clerk-invitations')
    @ApiOperation({ summary: 'Invite a new person to the group by email through Clerk' })
    @ApiResponse({ status: 201, type: ClerkGroupInvitationDto, description: 'The Clerk invitation was created and emailed' })
    createClerkInvitation(
        @Param('groupId', ParseIntPipe) groupId: number,
        @Req() request: { user: { userId: number } },
        @Body() body: CreateClerkGroupInvitationBody,
    ) {
        return this.clerkIdentityService.createGroupInvitation(groupId, request.user.userId, body.emailAddress)
    }

    @UseGuards(UserInGroupGuard)
    @Get('/:groupId/acquisition-board')
    @ApiOperation({ summary: 'Get the group acquisition board' })
    @ApiResponse({ status: 200, type: [GroupAcquisitionEntryDto] })
    getAcquisitionBoard(@Param('groupId', ParseIntPipe) groupId: number) {
        return this.groupAcquisitionService.getBoard(groupId)
    }

    @UseGuards(UserInGroupGuard)
    @Post('/:groupId/acquisition-board')
    @ApiOperation({ summary: 'Express interest in a game for the group' })
    @ApiResponse({ status: 201, description: 'Interest saved' })
    addAcquisitionInterest(
        @Param('groupId', ParseIntPipe) groupId: number,
        @Req() request: { user: { userId: number } },
        @Body() body: GroupGameInterestBody,
    ) {
        return this.groupAcquisitionService.addInterest(groupId, request.user.userId, body)
    }

    @UseGuards(UserInGroupGuard)
    @Delete('/:groupId/acquisition-board/:gameId')
    @ApiOperation({ summary: 'Remove the current member’s acquisition interest' })
    @ApiResponse({ status: 200, description: 'Interest removed' })
    removeAcquisitionInterest(
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
        @Req() request: { user: { userId: number } },
    ) {
        return this.groupAcquisitionService.removeInterest(groupId, request.user.userId, gameId)
    }

    @UseGuards(GroupOwnerGuard)
    @Put('/:groupId/acquisition-board/:gameId/decision')
    @ApiOperation({ summary: 'Update the group acquisition decision (owner only)' })
    @ApiResponse({ status: 200, description: 'Group acquisition decision updated' })
    updateAcquisitionDecision(
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
        @Req() request: { user: { userId: number } },
        @Body() body: UpdateGroupAcquisitionDecisionBody,
    ) {
        return this.groupAcquisitionService.updateDecision(groupId, request.user.userId, gameId, body)
    }
}
