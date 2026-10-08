import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard.js'
import { AccountMeetDto } from '../../../common/types/meet.type.js'

import { PlayService } from './play.service.js'
import {
    HistoryRecordDto,
    RecommendationFeedbackBody,
    ParticipantRecommendationFeedbackBody,
    RecommendationFeedbackDto,
    RecommendationRequestBody,
    ParticipantRecommendationRequestBody,
    RecommendationSignalsDto,
    RecommendationsDto,
} from './play.types.js'

@UseGuards(AuthGuard)
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

    @Post('/recommendations/participants')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @ApiOperation({ summary: 'Get deterministic recommendations for group people, including placeholders' })
    @ApiResponse({ status: 200, type: RecommendationsDto })
    getParticipantRecommendations(@Req() request: { user: { userId: number } }, @Body() body: ParticipantRecommendationRequestBody) {
        return this.playService.getParticipantRecommendations(request.user.userId, body)
    }

    @Post('/recommendations/feedback')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @ApiOperation({ summary: 'Record feedback for a recommendation' })
    @ApiResponse({ status: 201, type: RecommendationFeedbackDto })
    createRecommendationFeedback(@Req() request: { user: { userId: number } }, @Body() body: RecommendationFeedbackBody) {
        return this.playService.createRecommendationFeedback(request.user.userId, body)
    }

    @Post('/recommendations/participants/feedback')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @ApiOperation({ summary: 'Record feedback for a participant-scoped recommendation' })
    @ApiResponse({ status: 201, type: RecommendationFeedbackDto })
    createParticipantRecommendationFeedback(
        @Req() request: { user: { userId: number } },
        @Body() body: ParticipantRecommendationFeedbackBody,
    ) {
        return this.playService.createParticipantRecommendationFeedback(request.user.userId, body)
    }

    @Get('/recommendations/signals')
    @ApiOperation({ summary: 'View the latest group-level recommendation signals' })
    @ApiResponse({ status: 200, type: RecommendationSignalsDto })
    @ApiResponse({ status: 403, description: 'The current user does not belong to the group.' })
    getRecommendationSignals(@Req() request: { user: { userId: number } }, @Query('groupId', ParseIntPipe) groupId: number) {
        return this.playService.getRecommendationSignals(request.user.userId, groupId)
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
    @ApiResponse({ status: 200, type: [AccountMeetDto], description: "List of all meets of the user, with the user's own RSVP" })
    async getUserMeets(@Param('userId', ParseIntPipe) userId: number) {
        return this.playService.getUserMeets(userId)
    }
}
