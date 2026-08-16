import { Body, Controller, Post, Req, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { CreatePlaySessionBody, SessionCreatedDto } from '../../../common/types/session.type'

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
}
