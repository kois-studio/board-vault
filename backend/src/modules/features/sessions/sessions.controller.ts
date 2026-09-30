import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { AuthGuard } from '../../../common/guards/auth.guard'
import { MeetWithAttendeesAndGames } from '../../../common/types/meet.type'
import {
    CreatePlaySessionBody,
    CreateScheduledSessionBody,
    ScheduledSessionCreatedDto,
    SessionAttendeesUpdatedDto,
    SessionShortlistUpdatedDto,
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
} from '../../../common/types/session.type'

import { SessionsService } from './sessions.service'

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
    @ApiResponse({ status: 403, description: 'Only the session organizer may manage attendees.' })
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
    @ApiResponse({ status: 403, description: 'Only the session organizer may manage the shortlist.' })
    updateSessionShortlist(
        @Req() request: { user: { userId: number } },
        @Param('sessionId', ParseIntPipe) sessionId: number,
        @Body() body: UpdateSessionShortlistBody,
    ) {
        return this.sessionsService.updateSessionShortlist(request.user.userId, sessionId, body)
    }

    @Patch(':sessionId/played-games')
    @ApiOperation({ summary: 'Replace the games actually played in an editable session' })
    @ApiResponse({ status: 200, type: SessionPlayedGamesUpdatedDto })
    @ApiResponse({ status: 400, description: 'Every played game must be owned by at least one group member.' })
    @ApiResponse({ status: 403, description: 'Only the session organizer may record games played.' })
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
    @ApiResponse({ status: 403, description: 'Only the session organizer can record attendance.' })
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
}
