import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MeetAttendeesService } from './meet-attendees.service'
import { MeetAttendeeDto } from '../../common/types/meet-attendee.type'

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
}
