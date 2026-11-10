import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { RequestLocale } from '../../../common/decorators/request-locale.decorator.js'
import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard.js'
import { AccountMeetDto } from '../../../common/types/meet.type.js'

import { PlayService } from './play.service.js'
import {
    HistoryPageDto,
    HistoryRecordDto,
    HistoryQuery,
    HistorySummaryDto,
    HistorySummaryQuery,
    MeetsAroundDto,
    MeetsAroundQuery,
    RecommendationFeedbackBody,
    ParticipantRecommendationFeedbackBody,
    RecommendationFeedbackDto,
    RecommendationRequestBody,
    ParticipantRecommendationRequestBody,
    RecommendationSignalsDto,
    RecommendationsDto,
} from './play.types.js'

import type { Locale } from '../../../common/i18n/locale.js'

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
    getRecommendations(
        @Req() request: { user: { userId: number } },
        @Body() body: RecommendationRequestBody,
        @RequestLocale() locale: Locale,
    ) {
        return this.playService.getRecommendations(request.user.userId, body, locale)
    }

    @Post('/recommendations/participants')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @ApiOperation({ summary: 'Get deterministic recommendations for group people, including placeholders' })
    @ApiResponse({ status: 200, type: RecommendationsDto })
    getParticipantRecommendations(
        @Req() request: { user: { userId: number } },
        @Body() body: ParticipantRecommendationRequestBody,
        @RequestLocale() locale: Locale,
    ) {
        return this.playService.getParticipantRecommendations(request.user.userId, body, locale)
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

    // Kept as it was for the previous frontend release while both deploy (docs/api.md, Compatibility); remove it in a
    // later release, once no client reads it.
    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/history')
    @ApiOperation({
        summary: 'Every completed game night of the user. Deprecated: use GET /play/users/:userId/history/page (#252)',
        deprecated: true,
    })
    @ApiResponse({ status: 200, type: [HistoryRecordDto], description: 'Every completed game night of the user, newest first' })
    async getUserGamesHistory(@Param('userId', ParseIntPipe) userId: number, @RequestLocale() locale: Locale) {
        return this.playService.getUserGamesHistoryAll(userId, locale)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/history/page')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @ApiOperation({ summary: "A page of the user's completed game nights in their groups, newest first (#252)" })
    @ApiResponse({ status: 200, type: HistoryPageDto, description: 'One page of nights, and whether older ones remain.' })
    async getUserGamesHistoryPage(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() query: HistoryQuery,
        @RequestLocale() locale: Locale,
    ) {
        return this.playService.getUserGamesHistory(userId, query, locale)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/history/summary')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @ApiOperation({ summary: "Totals over the user's whole history: nights, games, people, and the most played games (#252)" })
    @ApiResponse({ status: 200, type: HistorySummaryDto })
    async getUserHistorySummary(
        @Param('userId', ParseIntPipe) userId: number,
        @Query() query: HistorySummaryQuery,
        @RequestLocale() locale: Locale,
    ) {
        return this.playService.getUserHistorySummary(userId, query, locale)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/meets')
    @ApiOperation({
        summary: "The user's game nights: every open one, those of the last 30 days, and each group's last completed one (#252)",
    })
    @ApiResponse({ status: 200, type: [AccountMeetDto], description: "The user's game nights, newest first, with the user's own RSVP" })
    async getUserMeets(@Param('userId', ParseIntPipe) userId: number) {
        return this.playService.getUserMeets(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/meets/around')
    @UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
    @ApiOperation({
        summary: "One group's game nights from the day before a date to the day after, for nights older than the list keeps (#252)",
    })
    @ApiResponse({ status: 200, type: MeetsAroundDto, description: 'The nights, newest first, and the records of the completed ones' })
    async getMeetsAround(@Param('userId', ParseIntPipe) userId: number, @Query() query: MeetsAroundQuery, @RequestLocale() locale: Locale) {
        return this.playService.getMeetsAround(userId, query, locale)
    }
}
