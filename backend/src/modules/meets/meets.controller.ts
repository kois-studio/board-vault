import { Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { SuccessDto } from '../../common/types/auth.type'
import { MeetDto, MeetWithAttendeesAndGames } from '../../common/types/meet.type'

import { MeetsService } from './meets.service'

@UseGuards(JwtAuthGuard)
@ApiTags('meets')
@ApiBearerAuth()
@Controller('meets')
export class MeetsController {
    constructor(private readonly meetsService: MeetsService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all meets', deprecated: true })
    @ApiResponse({ status: 200, type: [MeetDto], description: 'List of all meets' })
    async getMeets() {
        return this.meetsService.getMeets()
    }

    @Get('/:meetId')
    @ApiOperation({ summary: 'Get meet by id', deprecated: true })
    @ApiResponse({ status: 200, type: MeetDto, description: 'Meet found' })
    @ApiResponse({ status: 404, description: 'Meet not found' })
    getMeetById(@Param('meetId', ParseIntPipe) meetId: number) {
        return this.meetsService.getMeetById(meetId)
    }

    @Get('/:meetId/details')
    @ApiOperation({ summary: 'Get meet details by id' })
    @ApiResponse({ status: 200, type: MeetWithAttendeesAndGames, description: 'Meet details found' })
    @ApiResponse({ status: 404, description: 'Meet details not found' })
    getMeetDetailsById(@Param('meetId', ParseIntPipe) meetId: number) {
        return this.meetsService.getMeetDetailsById(meetId)
    }
}
