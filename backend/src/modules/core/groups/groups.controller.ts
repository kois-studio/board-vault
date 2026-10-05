import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { GroupOwnerGuard } from '../../../common/guards/group-owner.guard.js'
import { RateLimit, RateLimitGuard } from '../../../common/guards/rate-limit.guard.js'
import { UserInGroupGuard } from '../../../common/guards/user-in-group.guard.js'
import {
    ClerkGroupInvitationDto,
    ClerkInvitationIdParam,
    ClerkGroupInvitationSummaryDto,
    CreateClerkGroupInvitationBody,
} from '../../../common/types/clerk-invitation.type.js'
import {
    GroupAcquisitionEntryDto,
    GroupGameInterestBody,
    UpdateGroupAcquisitionDecisionBody,
} from '../../../common/types/group-game-interest.type.js'
import { GroupInsightsDto, UpdateGroupSpendingShareBody } from '../../../common/types/group-insights.type.js'
import { CreateGroupRequestBody, GroupDto, UpdateGroupBody } from '../../../common/types/group.type.js'
import { InvitationWithAccountsData } from '../../../common/types/invitation.type.js'
import { ClerkIdentityService } from '../../common/auth/clerk-identity.service.js'

import { GroupAcquisitionService } from './group-acquisition.service.js'
import { GroupInsightsService } from './group-insights.service.js'
import { GroupsService } from './groups.service.js'

@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
    constructor(
        private readonly groupsService: GroupsService,
        private readonly groupAcquisitionService: GroupAcquisitionService,
        private readonly clerkIdentityService: ClerkIdentityService,
        private readonly groupInsightsService: GroupInsightsService,
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

    // Each call makes Clerk send an email to an arbitrary address.
    @UseGuards(GroupOwnerGuard, RateLimitGuard)
    @RateLimit(20, 3600)
    @Post('/:groupId/clerk-invitations')
    @ApiOperation({ summary: 'Invite a new person to the group by email through Clerk' })
    @ApiResponse({ status: 201, type: ClerkGroupInvitationDto, description: 'The Clerk invitation was created and emailed' })
    createClerkInvitation(
        @Param('groupId', ParseIntPipe) groupId: number,
        @Req() request: { user: { userId: number } },
        @Body() body: CreateClerkGroupInvitationBody,
    ) {
        return body.groupPersonId === undefined
            ? this.clerkIdentityService.createGroupInvitation(groupId, request.user.userId, body.emailAddress)
            : this.clerkIdentityService.createGroupInvitation(groupId, request.user.userId, body.emailAddress, body.groupPersonId)
    }

    @UseGuards(GroupOwnerGuard)
    @Get('/:groupId/clerk-invitations')
    @ApiOperation({ summary: 'List pending Clerk invitations for a group (owner only)' })
    @ApiResponse({ status: 200, type: [ClerkGroupInvitationSummaryDto] })
    getClerkInvitations(@Param('groupId', ParseIntPipe) groupId: number, @Req() request: { user: { userId: number } }) {
        return this.clerkIdentityService.getGroupInvitations(groupId, request.user.userId)
    }

    @UseGuards(GroupOwnerGuard)
    @Delete('/:groupId/clerk-invitations/:invitationId')
    @ApiOperation({ summary: 'Revoke a pending Clerk invitation for a group (owner only)' })
    @ApiResponse({ status: 200, description: 'The Clerk invitation was revoked' })
    revokeClerkInvitation(
        @Param('groupId', ParseIntPipe) groupId: number,
        @Param() params: ClerkInvitationIdParam,
        @Req() request: { user: { userId: number } },
    ) {
        return this.clerkIdentityService.revokeGroupInvitation(groupId, request.user.userId, params.invitationId)
    }

    @UseGuards(UserInGroupGuard)
    @Get('/:groupId/insights')
    @ApiOperation({ summary: 'Get group history insights and spending shared by members' })
    @ApiResponse({ status: 200, type: GroupInsightsDto })
    getInsights(@Param('groupId', ParseIntPipe) groupId: number, @Req() request: { user: { userId: number } }) {
        return this.groupInsightsService.getInsights(groupId, request.user.userId)
    }

    @UseGuards(UserInGroupGuard)
    @Put('/:groupId/spending-share')
    @ApiOperation({ summary: 'Choose whether to share recorded game spending with this group' })
    @ApiResponse({ status: 200, description: 'Spending sharing preference saved' })
    setSpendingShare(
        @Param('groupId', ParseIntPipe) groupId: number,
        @Req() request: { user: { userId: number } },
        @Body() body: UpdateGroupSpendingShareBody,
    ) {
        return this.groupInsightsService.setSpendingShare(groupId, request.user.userId, body.share)
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
