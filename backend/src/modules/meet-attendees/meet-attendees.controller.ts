import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MeetAttendeesService } from './meet-attendees.service'
import { MeetAttendeeDto, UpdateMeetAttendeeBody } from '../../common/types/meet-attendee.type'

@UseGuards(JwtAuthGuard)
@ApiTags('meetAttendees')
@ApiBearerAuth()
@Controller('meetAttendees')
export class MeetAttendeesController {
    constructor(private readonly meetAttendeesService: MeetAttendeesService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all meet attendees', deprecated: true })
    @ApiResponse({ status: 200, type: [MeetAttendeeDto], description: 'List of all meet attendees' })
    async getMeetAttendees() {
        return this.meetAttendeesService.getMeetAttendees()
    }

    @Get('/:meetId')
    @ApiOperation({ summary: 'Get meet attendees by MeetId', deprecated: false })
    @ApiResponse({ status: 200, type: [MeetAttendeeDto], description: 'List of meet attendees by meetId' })
    async getMeetAttendeeByMeetId(@Param('meetId', ParseIntPipe) meetId: number) {
        return this.meetAttendeesService.getMeetAttendeeByMeetId(meetId)
    }

    @Put(':meetId/:accountId')
    @ApiOperation({ summary: 'Update meetAttendees ', deprecated: false })
    @ApiResponse({ status: 200, description: 'The meetAttendees has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'MeetId not found.' })
    updateMeetAttendee(
        @Param('meetId', ParseIntPipe) meetId: number,
        @Param('accountId', ParseIntPipe) accountId: number,
        @Body() partialMeetAttendee: UpdateMeetAttendeeBody,
    ) {
        return this.meetAttendeesService.updateMeetAttendee(accountId, meetId, partialMeetAttendee)
    }
}
