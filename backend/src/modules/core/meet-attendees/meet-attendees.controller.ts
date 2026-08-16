import { Controller, Delete, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { SuccessDto } from '../../../common/types/auth.type'
import { MeetAttendeeDto } from '../../../common/types/meet-attendee.type'

import { MeetAttendeesService } from './meet-attendees.service'

@UseGuards(JwtAuthGuard)
@ApiTags('meetAttendees')
@ApiBearerAuth()
@Controller('meetAttendees')
export class MeetAttendeesController {
    constructor(private readonly meetAttendeesService: MeetAttendeesService) {}

    @Post(':meetId/:accountId')
    @ApiOperation({ summary: 'Add a group member to a meeting' })
    @ApiResponse({ status: 200, type: MeetAttendeeDto })
    @ApiResponse({ status: 403, description: 'Only the meeting creator may manage attendees.' })
    createMeetAttendee(
        @Req() request: { user: { userId: number } },
        @Param('meetId', ParseIntPipe) meetId: number,
        @Param('accountId', ParseIntPipe) accountId: number,
    ) {
        return this.meetAttendeesService.createMeetAttendee(request.user.userId, meetId, accountId)
    }

    @Delete(':meetId/:accountId')
    @ApiOperation({ summary: 'Remove a group member from a meeting' })
    @ApiResponse({ status: 200, type: SuccessDto })
    @ApiResponse({ status: 403, description: 'Only the meeting creator may manage attendees.' })
    deleteMeetAttendee(
        @Req() request: { user: { userId: number } },
        @Param('meetId', ParseIntPipe) meetId: number,
        @Param('accountId', ParseIntPipe) accountId: number,
    ) {
        return this.meetAttendeesService.deleteMeetAttendee(request.user.userId, meetId, accountId)
    }
}
