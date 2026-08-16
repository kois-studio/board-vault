import { Body, Controller, Get, Param, ParseIntPipe, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { MeetDto } from '../../../common/types/meet.type'

import { PlayService } from './play.service'
import { HistoryRecordDto, RecommendationRequestBody, RecommendationsDto } from './play.types'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@ApiTags('play')
@ApiBearerAuth()
@Controller('play')
export class PlayController {
    constructor(private readonly playService: PlayService) {}

    @Post('/recommendations')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @ApiOperation({ summary: 'Get deterministic recommendations for selected group attendees' })
    @ApiResponse({ status: 200, type: RecommendationsDto })
    getRecommendations(@Req() request: { user: { userId: number } }, @Body() body: RecommendationRequestBody) {
        return this.playService.getRecommendations(request.user.userId, body)
    }

    @UseGuards(UserOwnershipGuard)
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
