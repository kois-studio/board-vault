import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { UserOwnershipGuard } from 'src/common/guards/ownership.guard'
import { MeetDto } from 'src/common/types/meet.type'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'

import { PlayService } from './play.service'
import { HistoryRecordDto } from './play.types'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@ApiTags('play')
@ApiBearerAuth()
@Controller('play')
export class PlayController {
    constructor(private readonly playService: PlayService) {}

    @Get('/users/:userId/history')
    @ApiOperation({ summary: 'List of all games played by the user', deprecated: false })
    @ApiResponse({ status: 200, type: [HistoryRecordDto], description: 'List of all games played by the user' })
    async getUserGamesHistory(@Param('userId', ParseIntPipe) userId: number) {
        return this.playService.getUserGamesHistory(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/meets')
    @ApiOperation({ summary: 'List of all meets of the user', deprecated: false })
    @ApiResponse({ status: 200, type: [MeetDto], description: 'List of all meets of the user' })
    async getUserMeets(@Param('userId', ParseIntPipe) userId: number) {
        return this.playService.getUserMeets(userId)
    }
}
