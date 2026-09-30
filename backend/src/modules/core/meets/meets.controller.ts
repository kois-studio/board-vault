import { Controller, Get, Param, ParseIntPipe, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard'
import { MeetDto, MeetWithAttendeesAndGames } from '../../../common/types/meet.type'

import { MeetsService } from './meets.service'

@UseGuards(AuthGuard)
@ApiTags('meets')
@ApiBearerAuth()
@Controller('meets')
export class MeetsController {
    constructor(private readonly meetsService: MeetsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all meets', deprecated: true })
    @ApiResponse({ status: 200, type: [MeetDto], description: 'List of all meets' })
    async getMeets(@Req() request: { user: { userId: number } }) {
        return this.meetsService.getMeetsForAccount(request.user.userId)
    }

    @Get('/:meetId')
    @ApiOperation({ summary: 'Get meet by id', deprecated: true })
    @ApiResponse({ status: 200, type: MeetDto, description: 'Meet found' })
    @ApiResponse({ status: 404, description: 'Meet not found' })
    getMeetById(@Req() request: { user: { userId: number } }, @Param('meetId', ParseIntPipe) meetId: number) {
        return this.meetsService.getMeetById(meetId, request.user.userId)
    }

    @Get('/:meetId/details')
    @ApiOperation({ summary: 'Get legacy meet details by id', deprecated: true })
    @ApiResponse({ status: 200, type: MeetWithAttendeesAndGames, description: 'Meet details found' })
    @ApiResponse({ status: 404, description: 'Meet details not found' })
    getMeetDetailsById(@Req() request: { user: { userId: number } }, @Param('meetId', ParseIntPipe) meetId: number) {
        return this.meetsService.getMeetDetailsById(meetId, request.user.userId)
    }
}
