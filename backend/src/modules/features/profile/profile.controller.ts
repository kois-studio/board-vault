import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { SuccessDto } from '../../../common/types/auth.type'
import { InvitationWithExtraData } from '../../../common/types/invitation.type'
import { NotificationDto } from '../../../common/types/notification.type'
import { UserGetDto } from '../../../common/types/user.type'

import { ProfileService } from './profile.service'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@ApiTags('profile')
@ApiBearerAuth()
@Controller('profile')
export class ProfileController {
    constructor(private readonly profileService: ProfileService) {}

    @Get('/users/byEmail/:email')
    @ApiOperation({ summary: 'Get user by email', deprecated: false })
    @ApiResponse({ status: 200, type: UserGetDto, description: 'User found' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async getUserByEmail(@Param('email') email: string) {
        return this.profileService.getUserByEmail(email)
    }

    @Get('/users/:userId/notifications')
    @ApiOperation({ summary: 'Get notifications by user id', deprecated: false })
    @ApiResponse({ status: 200, type: NotificationDto, description: 'Notifications found' })
    @ApiResponse({ status: 404, description: 'Notifications not found' })
    async getNotificationsByAccountId(@Param('userId', ParseIntPipe) userId: number) {
        return this.profileService.getNotificationsByAccountId(userId)
    }

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
}
