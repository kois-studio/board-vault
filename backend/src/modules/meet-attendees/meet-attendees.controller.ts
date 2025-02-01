import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MeetAttendeesService } from './meet-attendees.service'
import { MeetAttendeeDto } from '../../common/types/meet-attendee.type'
import { SuccessDto } from '../../common/types/auth.type'

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

    @Post(':meetId/:accountId')
    @ApiOperation({ summary: 'Create meetAttendees ', deprecated: false })
    @ApiResponse({ status: 200, type: MeetAttendeeDto, description: 'The meetAttendees has been successfully created.' })
    @ApiResponse({ status: 404, description: 'MeetId not found.' })
    async createMeetAttendee(@Param('meetId', ParseIntPipe) meetId: number, @Param('accountId', ParseIntPipe) accountId: number) {
        return this.meetAttendeesService.createMeetAttendee(meetId, accountId)
    }

    @Delete(':meetId/:accountId')
    @ApiOperation({ summary: 'Update meetAttendees ', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The meetAttendees has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'MeetId not found.' })
    updateMeetAttendee(@Param('meetId', ParseIntPipe) meetId: number, @Param('accountId', ParseIntPipe) accountId: number) {
        return this.meetAttendeesService.deleteMeetAttendee(meetId, accountId)
    }
}
