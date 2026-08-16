import { Body, Controller, Param, ParseIntPipe, Patch, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import {
    CreatePlaySessionBody,
    CreateScheduledSessionBody,
    ScheduledSessionCreatedDto,
    SessionCreatedDto,
    SessionStatusUpdatedDto,
    UpdateSessionStatusBody,
} from '../../../common/types/session.type'

import { SessionsService } from './sessions.service'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
@ApiTags('sessions')
@ApiBearerAuth()
@Controller('sessions')
export class SessionsController {
    constructor(private readonly sessionsService: SessionsService) {}

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
