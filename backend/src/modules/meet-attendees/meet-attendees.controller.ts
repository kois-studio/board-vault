import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MeetAttendeesService } from './meet-attendees.service'
import { MeetDto } from '../../common/types/meet.type'

@UseGuards(JwtAuthGuard)
@ApiTags('meetAttendees')
@ApiBearerAuth()
@Controller('meetAttendees')
export class MeetAttendeesController {
    constructor(private readonly meetAttendeesService: MeetAttendeesService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all meet attendees', deprecated: true })
    @ApiResponse({ status: 200, type: [MeetDto], description: 'List of all meet attendees' })
    async getMeets() {
        return this.meetAttendeesService.getMeetAttendees()
    }
}
