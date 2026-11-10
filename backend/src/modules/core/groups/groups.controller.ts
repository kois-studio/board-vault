import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { RequestLocale } from '../../../common/decorators/request-locale.decorator.js'
import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { GroupOwnerGuard } from '../../../common/guards/group-owner.guard.js'
import { UserInGroupGuard } from '../../../common/guards/user-in-group.guard.js'
import { GroupActivityPageDto, GroupActivityQuery } from '../../../common/types/group-activity.type.js'
import {
    GroupAcquisitionEntryDto,
    GroupGameInterestBody,
    UpdateGroupAcquisitionDecisionBody,
} from '../../../common/types/group-game-interest.type.js'
import { GroupCollectionDto, GroupInsightsDto } from '../../../common/types/group-insights.type.js'
import { CreateGroupRequestBody, GroupDto, UpdateGroupBody } from '../../../common/types/group.type.js'
import { InvitationWithAccountsData } from '../../../common/types/invitation.type.js'

import { GroupAcquisitionService } from './group-acquisition.service.js'
import { GroupActivityService } from './group-activity.service.js'
import { GroupInsightsService } from './group-insights.service.js'
import { GroupsService } from './groups.service.js'

import type { Locale } from '../../../common/i18n/locale.js'

@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('groups')
@ApiBearerAuth()
@Controller('groups')
export class GroupsController {
    constructor(
        private readonly groupsService: GroupsService,
        private readonly groupAcquisitionService: GroupAcquisitionService,
        private readonly groupInsightsService: GroupInsightsService,
        private readonly groupActivityService: GroupActivityService,
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

    @UseGuards(UserInGroupGuard)
    @Get('/:groupId/activity')
    @ApiOperation({ summary: 'Get the group history: who changed what in the group, newest first (ADR-0020)' })
    @ApiResponse({ status: 200, type: GroupActivityPageDto })
    @ApiResponse({ status: 403, description: 'Only current members of the group can read its history.' })
    getActivity(@Param('groupId', ParseIntPipe) groupId: number, @Query() query: GroupActivityQuery, @RequestLocale() locale: Locale) {
        return this.groupActivityService.getPage(groupId, query.before, query.limit, locale)
    }

    @UseGuards(UserInGroupGuard)
    @Get('/:groupId/insights')
    @ApiOperation({ summary: 'Get standings, most played and never played games from completed game nights' })
    @ApiResponse({ status: 200, type: GroupInsightsDto })
    getInsights(@Param('groupId', ParseIntPipe) groupId: number, @RequestLocale() locale: Locale) {
        return this.groupInsightsService.getInsights(groupId, locale)
    }

    @UseGuards(UserInGroupGuard)
    @Get('/:groupId/collection')
    @ApiOperation({ summary: "Get everyone's games in the group and their approximate worth from catalogue retail prices" })
    @ApiResponse({ status: 200, type: GroupCollectionDto })
    getCollection(@Param('groupId', ParseIntPipe) groupId: number, @RequestLocale() locale: Locale) {
        return this.groupInsightsService.getCollection(groupId, locale)
    }

    @UseGuards(UserInGroupGuard)
    @Get('/:groupId/acquisition-board')
    @ApiOperation({ summary: 'Get the group acquisition board' })
    @ApiResponse({ status: 200, type: [GroupAcquisitionEntryDto] })
    getAcquisitionBoard(@Param('groupId', ParseIntPipe) groupId: number, @RequestLocale() locale: Locale) {
        return this.groupAcquisitionService.getBoard(groupId, locale)
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
