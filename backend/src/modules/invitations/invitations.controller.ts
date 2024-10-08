import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { InvitationsService } from './invitations.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CreateInvitationBody, CreateInvitationByUsernameBody, InvitationDto } from '../../common/types/invitation.type'
import { SuccessDto } from '../../common/types/auth.type'
import { UserGetDto } from 'src/common/types/user.type'

@UseGuards(JwtAuthGuard)
@ApiTags('invitations')
@ApiBearerAuth()
@Controller('invitations')
export class InvitationsController {
    constructor(private readonly invitationsService: InvitationsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all invitations' })
    @ApiResponse({ status: 200, type: [InvitationDto], description: 'List of all invitations' })
    async getInvitations() {
        return this.invitationsService.getInvitations()
    }

    @Get('/:invitationId')
    @ApiOperation({ summary: 'Get invitation by id' })
    @ApiResponse({ status: 200, type: InvitationDto, description: 'Invitation found' })
    @ApiResponse({ status: 404, description: 'Invitation not found' })
    @ApiParam({ name: 'invitationId', type: String })
    getInvitationById(@Param('invitationId', ParseIntPipe) invitationId: number) {
        return this.invitationsService.getInvitationById(invitationId)
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new invitation' })
    @ApiResponse({ status: 201, type: SuccessDto, description: 'The invitation has been succesfully created' })
    async createInvitation(@Body() invitationDto: CreateInvitationBody) {
        return this.invitationsService.createInvitation(invitationDto)
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
    @ApiParam({ name: 'invitationId', type: String, description: 'ID of the invitation to be deleted' })
    async deleteInvitationById(@Param('invitationId', ParseIntPipe) invitationId: number) {
        return this.invitationsService.deleteInvitationById(invitationId)
    }
}
