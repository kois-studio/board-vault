import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { UserInGroupGuard } from '../../../common/guards/user-in-group.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { SuccessDto } from '../../../common/types/auth.type'
import {
    CreateInvitationBody,
    CreateInvitationByUsernameBody,
    CreateInvitationByUsernameRequestBody,
    CreateInvitationRequestBody,
    InvitationDto,
} from '../../../common/types/invitation.type'
import { UserPublicDto } from '../../../common/types/user.type'

import { InvitationsService } from './invitations.service'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all invitations', deprecated: true })
    @ApiResponse({ status: 200, type: [InvitationDto], description: 'List of all invitations' })
    async getInvitations(@Req() request: { user: { userId: number } }) {
        return this.invitationsService.getInvitations(request.user.userId)
    }

    @UseGuards(UserInGroupGuard)
    @Post('/')
    @ApiOperation({ summary: 'Create a new invitation', deprecated: true })
    @ApiResponse({ status: 201, type: SuccessDto, description: 'The invitation has been succesfully created' })
    async createInvitation(@Req() request: { user: { userId: number } }, @Body() invitationDto: CreateInvitationRequestBody) {
        return this.invitationsService.createInvitation({
            ...invitationDto,
            fromAccountId: request.user.userId,
        } as CreateInvitationBody)
    }

    @Get('/:invitationId')
    @ApiOperation({ summary: 'Get invitation by id', deprecated: true })
    @ApiResponse({ status: 200, type: InvitationDto, description: 'Invitation found' })
    @ApiResponse({ status: 404, description: 'Invitation not found' })
    getInvitationById(@Req() request: { user: { userId: number } }, @Param('invitationId', ParseIntPipe) invitationId: number) {
        return this.invitationsService.getInvitationByIdForAccount(invitationId, request.user.userId)
    }

    @UseGuards(UserInGroupGuard)
    @Post('/byUsername')
    @ApiOperation({ summary: 'Create a new invitation' })
    @ApiResponse({ status: 201, type: UserPublicDto, description: 'The invitation has been succesfully created' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async createInvitationByUsername(
        @Req() request: { user: { userId: number } },
        @Body() invitationDto: CreateInvitationByUsernameRequestBody,
    ) {
        return this.invitationsService.createInvitationByUsername({
            ...invitationDto,
            fromAccountId: request.user.userId,
        } as CreateInvitationByUsernameBody)
    }

    @Delete('/:invitationId')
    @ApiOperation({ summary: 'Delete a invitation by Id' })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The invitation has been succesfully deleted' })
    async deleteInvitationById(@Req() request: { user: { userId: number } }, @Param('invitationId', ParseIntPipe) invitationId: number) {
        return this.invitationsService.deleteInvitationById(invitationId, request.user.userId)
    }

    @Post('/:invitationId/reject')
    @ApiOperation({ summary: 'Reject -> add to group -> notify' })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The invitation has been rejected' })
    async rejectInvitation(@Req() request: { user: { userId: number } }, @Param('invitationId', ParseIntPipe) invitationId: number) {
        return this.invitationsService.rejectInvitation(invitationId, request.user.userId)
    }
}
