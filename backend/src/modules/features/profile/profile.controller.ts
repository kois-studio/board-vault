import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
import { SuccessDto } from '../../../common/types/auth.type'
import { CreateGameProposalBody, GameProposalDto } from '../../../common/types/game-proposal.type'
import { InvitationWithExtraData } from '../../../common/types/invitation.type'
import { NotificationDto } from '../../../common/types/notification.type'
import { UserProposalStatsDto } from '../../../common/types/stats.type'
import { UserSelfDto } from '../../../common/types/user.type'

import { ProfileService } from './profile.service'

@UseGuards(AuthGuard)
@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId')
    @ApiOperation({ summary: 'Get user by id', deprecated: false })
    @ApiResponse({ status: 200, type: UserSelfDto, description: 'Authenticated user profile found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getUserById(@Param('userId', ParseIntPipe) userId: number) {
        return this.profileService.getUserById(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/notifications')
    @ApiOperation({ summary: 'Get notifications by user id', deprecated: false })
    @ApiResponse({ status: 200, type: NotificationDto, description: 'Notifications found' })
    @ApiResponse({ status: 404, description: 'Notifications not found' })
    async getNotificationsByAccountId(@Param('userId', ParseIntPipe) userId: number) {
        return this.profileService.getNotificationsByAccountId(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/invitations')
    @ApiOperation({ summary: 'Get invitations received', deprecated: false })
    @ApiResponse({ status: 200, type: [InvitationWithExtraData] })
    getUserInvitations(@Param('userId', ParseIntPipe) userId: number) {
        return this.profileService.getUserInvitations(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/users/:userId/invitations/:invitationId/accept')
    @ApiOperation({ summary: 'Accept invitation', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'Invitation accepted' })
    @ApiResponse({ status: 404, description: 'Invitation not found' })
    acceptInvitation(@Param('userId', ParseIntPipe) userId: number, @Param('invitationId', ParseIntPipe) invitationId: number) {
        return this.profileService.acceptInvitation(userId, invitationId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/proposals')
    @ApiOperation({ summary: 'Get user proposals', deprecated: false })
    @ApiResponse({ status: 200, type: [GameProposalDto], description: 'User proposals found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getUserProposals(@Param('userId', ParseIntPipe) userId: number) {
        return this.profileService.getUserProposals(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/proposal-stats')
    @ApiOperation({ summary: 'Get user proposal statistics', deprecated: false })
    @ApiResponse({ status: 200, type: UserProposalStatsDto, description: 'User proposal stats found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getUserProposalStats(@Param('userId', ParseIntPipe) userId: number) {
        return this.profileService.getUserProposalStats(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/users/:userId/proposals')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @ApiOperation({ summary: 'Create a new game proposal', deprecated: false })
    @ApiResponse({ status: 201, type: GameProposalDto, description: 'Game proposal created' })
    @ApiResponse({ status: 400, description: 'Invalid proposal data' })
    async createGameProposal(@Param('userId', ParseIntPipe) userId: number, @Body() proposalData: CreateGameProposalBody) {
        return this.profileService.createGameProposal(userId, proposalData)
    }
}
