import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    ParseIntPipe,
    Patch,
    Post,
    Put,
    Req,
    UseGuards,
    UsePipes,
    ValidationPipe,
} from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard.js'
import { MeetWithAttendeesAndGames } from '../../../common/types/meet.type.js'
import {
    CreatePlaySessionBody,
    CreateScheduledSessionBody,
    ScheduledSessionCreatedDto,
    SessionAttendeesUpdatedDto,
    SessionShortlistUpdatedDto,
    SessionGameProposedDto,
    SessionGameVotesUpdatedDto,
    SessionGameBringersUpdatedDto,
    SetSessionGameBringerBody,
    SessionPlayedGamesUpdatedDto,
    SessionCreatedDto,
    SessionRsvpUpdatedDto,
    SessionAttendanceUpdatedDto,
    SessionStatusUpdatedDto,
    UpdateSessionAttendeesBody,
    UpdateSessionShortlistBody,
    UpdateSessionPlayedGamesBody,
    UpdateSessionRsvpBody,
    UpdateSessionAttendanceBody,
    UpdateSessionStatusBody,
    UpdateGameResultsBody,
    GameResultsUpdatedDto,
} from '../../../common/types/session.type.js'

import { SessionsService } from './sessions.service.js'

@UseGuards(AuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
    constructor(private readonly sessionsService: SessionsService) {}

    @Get(':sessionId')
    @ApiOperation({ summary: 'Get a session with attendees and planned/played games' })
    @ApiResponse({ status: 200, type: MeetWithAttendeesAndGames })
    @ApiResponse({ status: 404, description: 'Session not found or not visible to the current member.' })
    getSessionDetails(@Req() request: { user: { userId: number } }, @Param('sessionId', ParseIntPipe) sessionId: number) {
        return this.sessionsService.getSessionDetails(request.user.userId, sessionId)
    }

    @Post()
    @ApiOperation({ summary: 'Create a completed play session from selected attendees and games' })
    @ApiResponse({ status: 201, type: SessionCreatedDto })
    @ApiResponse({ status: 400, description: 'The selected group, attendees, games, or participants are invalid.' })
    createCompletedSession(@Req() request: { user: { userId: number } }, @Body() body: CreatePlaySessionBody) {
        return this.sessionsService.createCompletedSession(request.user.userId, body)
    }

    @Post('scheduled')
    @ApiOperation({ summary: 'Schedule a session for a group' })
    @ApiResponse({ status: 201, type: ScheduledSessionCreatedDto })
    createScheduledSession(@Req() request: { user: { userId: number } }, @Body() body: CreateScheduledSessionBody) {
        return this.sessionsService.createScheduledSession(request.user.userId, body)
    }

    @Patch(':sessionId/attendees')
    @ApiOperation({ summary: 'Replace the attendees of an editable session' })
    @ApiResponse({ status: 200, type: SessionAttendeesUpdatedDto })
    @ApiResponse({ status: 400, description: 'The session must retain at least one group member.' })
    @ApiResponse({ status: 403, description: 'Only the organizer or the group owner may change who is invited (ADR-0019).' })
    updateSessionAttendees(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Body() body: UpdateSessionAttendeesBody,
    ) {
        return this.sessionsService.updateSessionAttendees(request.user.userId, sessionId, body)
    }

    @Patch(':sessionId/shortlist')
    @ApiOperation({ summary: 'Replace the planned games of an editable session' })
    @ApiResponse({ status: 200, type: SessionShortlistUpdatedDto })
    @ApiResponse({ status: 400, description: 'The planned games must be owned by at least one group member.' })
    @ApiResponse({ status: 403, description: 'Only the organizer or the group owner may replace the shortlist (ADR-0019).' })
    updateSessionShortlist(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Body() body: UpdateSessionShortlistBody,
    ) {
        return this.sessionsService.updateSessionShortlist(request.user.userId, sessionId, body)
    }

    @Post(':sessionId/shortlist/:gameId')
    @ApiOperation({ summary: 'Add one game to the shortlist, with the caller’s vote' })
    @ApiResponse({ status: 201, type: SessionGameProposedDto })
    @ApiResponse({ status: 400, description: 'The game must be owned by at least one group member, and the night still open.' })
    @ApiResponse({ status: 403, description: 'Only people coming to the game night may add games (ADR-0019).' })
    proposeSessionGame(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ) {
        return this.sessionsService.proposeSessionGame(request.user.userId, sessionId, gameId)
    }

    @Put(':sessionId/votes/:gameId')
    @ApiOperation({ summary: 'Vote for a shortlisted game: the caller would play it on the night' })
    @ApiResponse({ status: 200, type: SessionGameVotesUpdatedDto })
    @ApiResponse({ status: 400, description: 'Only shortlisted games of an open night can be voted for.' })
    @ApiResponse({ status: 403, description: 'Only people coming to the game night may vote (ADR-0019).' })
    voteForSessionGame(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ) {
        return this.sessionsService.setSessionGameVote(request.user.userId, sessionId, gameId, true)
    }

    @Delete(':sessionId/votes/:gameId')
    @ApiOperation({ summary: 'Take back the caller’s vote for a shortlisted game' })
    @ApiResponse({ status: 200, type: SessionGameVotesUpdatedDto })
    @ApiResponse({ status: 403, description: 'Only people coming to the game night may vote (ADR-0019).' })
    removeVoteForSessionGame(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ) {
        return this.sessionsService.setSessionGameVote(request.user.userId, sessionId, gameId, false)
    }

    @Put(':sessionId/games/:gameId/bringer')
    @ApiOperation({ summary: 'Say who brings a shortlisted game: yourself, or (organizer) a group person who owns it' })
    @ApiResponse({ status: 200, type: SessionGameBringersUpdatedDto })
    @ApiResponse({ status: 400, description: 'The bringer must own the game and be coming, and the game be on the shortlist.' })
    @ApiResponse({ status: 403, description: 'Only people coming may bring games; only the organizer may name someone else.' })
    setSessionGameBringer(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
        @Body() body: SetSessionGameBringerBody,
    ) {
        return this.sessionsService.setSessionGameBringer(request.user.userId, sessionId, gameId, body)
    }

    @Delete(':sessionId/games/:gameId/bringer')
    @ApiOperation({ summary: 'Clear who brings a shortlisted game (the bringer or the organizer)' })
    @ApiResponse({ status: 200, type: SessionGameBringersUpdatedDto })
    clearSessionGameBringer(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ) {
        return this.sessionsService.setSessionGameBringer(request.user.userId, sessionId, gameId, null)
    }

    @Patch(':sessionId/played-games')
    @ApiOperation({ summary: 'Replace the games actually played in an editable session' })
    @ApiResponse({ status: 200, type: SessionPlayedGamesUpdatedDto })
    @ApiResponse({ status: 400, description: 'Every played game must be owned by at least one group member.' })
    @ApiResponse({ status: 403, description: 'Only people coming to the game night may record games played (ADR-0019).' })
    updateSessionPlayedGames(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Body() body: UpdateSessionPlayedGamesBody,
    ) {
        return this.sessionsService.updateSessionPlayedGames(request.user.userId, sessionId, body)
    }

    @Patch(':sessionId/rsvp')
    @ApiOperation({ summary: 'Respond to the current user’s session invitation' })
    @ApiResponse({ status: 200, type: SessionRsvpUpdatedDto })
    @ApiResponse({ status: 403, description: 'The current user is not invited to this session.' })
    updateSessionRsvp(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Body() body: UpdateSessionRsvpBody,
    ) {
        return this.sessionsService.updateSessionRsvp(request.user.userId, sessionId, body)
    }

    @Patch(':sessionId/attendance')
    @ApiOperation({ summary: 'Record which invited members actually attended a session' })
    @ApiResponse({ status: 200, type: SessionAttendanceUpdatedDto })
    @ApiResponse({ status: 403, description: 'Only people coming to the game night may record attendance (ADR-0019).' })
    updateSessionAttendance(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Body() body: UpdateSessionAttendanceBody,
    ) {
        return this.sessionsService.updateSessionAttendance(request.user.userId, sessionId, body)
    }

    @Patch(':sessionId/status')
    @ApiOperation({ summary: 'Transition a session lifecycle status' })
    @ApiResponse({ status: 200, type: SessionStatusUpdatedDto })
    @ApiResponse({ status: 400, description: 'The requested lifecycle transition is invalid.' })
    updateSessionStatus(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Body() body: UpdateSessionStatusBody,
    ) {
        return this.sessionsService.updateSessionStatus(request.user.userId, sessionId, body)
    }

    @Put(':sessionId/games/:gameId/results')
    @ApiOperation({ summary: 'Replace who won a played game, with optional scores' })
    @ApiResponse({ status: 200, type: GameResultsUpdatedDto })
    @ApiResponse({ status: 400, description: 'The game was not played, or a result names someone who did not play it.' })
    @ApiResponse({ status: 404, description: 'Session not found or not visible to the current member.' })
    updateGameResults(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
        @Body() body: UpdateGameResultsBody,
    ) {
        return this.sessionsService.updateGameResults(request.user.userId, sessionId, gameId, body)
    }
}
