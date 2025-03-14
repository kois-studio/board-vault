import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { InvitationsService } from './invitations.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CreateInvitationBody, CreateInvitationByUsernameBody, InvitationDto } from '../../common/types/invitation.type'
import { SuccessDto } from '../../common/types/auth.type'
import { UserGetDto } from '../../common/types/user.type'

@UseGuards(JwtAuthGuard)
@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all invitations', deprecated: true })
    @ApiResponse({ status: 200, type: [InvitationDto], description: 'List of all invitations' })
    async getInvitations() {
        return this.invitationsService.getInvitations()
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new invitation', deprecated: true })
    @ApiResponse({ status: 201, type: SuccessDto, description: 'The invitation has been succesfully created' })
    async createInvitation(@Body() invitationDto: CreateInvitationBody) {
        return this.invitationsService.createInvitation(invitationDto)
    }

    @Get('/:invitationId')
    @ApiOperation({ summary: 'Get invitation by id', deprecated: true })
    @ApiResponse({ status: 200, type: InvitationDto, description: 'Invitation found' })
    @ApiResponse({ status: 404, description: 'Invitation not found' })
    getInvitationById(@Param('invitationId', ParseIntPipe) invitationId: number) {
        return this.invitationsService.getInvitationById(invitationId)
    }

    @Post('/byUsername')
    @ApiOperation({ summary: 'Create a new invitation' })
    @ApiResponse({ status: 201, type: UserGetDto, description: 'The invitation has been succesfully created' })
    @ApiResponse({ status: 404, description: 'User not found' })
    async createInvitationByUsername(@Body() invitationDto: CreateInvitationByUsernameBody) {
        return this.invitationsService.createInvitationByUsername(invitationDto)
    }

    @Delete('/:invitationId')
    @ApiOperation({ summary: 'Delete a invitation by Id' })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The invitation has been succesfully deleted' })
    async deleteInvitationById(@Param('invitationId', ParseIntPipe) invitationId: number) {
        return this.invitationsService.deleteInvitationById(invitationId)
    }

    @Post('/:invitationId/reject')
    @ApiOperation({ summary: 'Reject -> add to group -> notify' })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The invitation has been rejected' })
    async rejectInvitation(@Param('invitationId', ParseIntPipe) invitationId: number) {
        return this.invitationsService.rejectInvitation(invitationId)
    }
}
