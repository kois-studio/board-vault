import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GamePlaySessionService } from './game-play-session.service'
import { CreateGamePlaySessionBody, GamePlaySessionDto } from '../../common/types/game-play-session.type'

@UseGuards(JwtAuthGuard)
@ApiTags('gamePlaySession')
@ApiBearerAuth()
@Controller('gamePlaySession')
export class GamePlaySessionController {
    constructor(private readonly gamePlaySessionService: GamePlaySessionService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all GamePlaySessions', deprecated: true })
    @ApiResponse({ status: 200, type: [GamePlaySessionDto], description: 'List of all GamePlaySessions' })
    async getGamePlaySessions() {
        return this.gamePlaySessionService.getGamePlaySessions()
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new GamePlaySession', deprecated: true })
    @ApiResponse({ status: 201, description: 'The GamePlaySession has been succesfully created' })
    async createGamePlaySession(@Body() gamePlaySessionBody: CreateGamePlaySessionBody) {
        return this.gamePlaySessionService.createGamePlaySession(gamePlaySessionBody)
    }

    @Get('/:accountId/:gameId')
    @ApiOperation({ summary: 'Get GamePlaySession by accountId and gameId', deprecated: true })
    @ApiResponse({ status: 200, type: [GamePlaySessionDto], description: 'GamePlaySession found' })
    @ApiResponse({ status: 404, description: 'GamePlaySession not found' })
    getGamePlaySessionById(@Param('accountId', ParseIntPipe) accountId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.gamePlaySessionService.getGamePlaySessionById(accountId, gameId)
    }

    @Delete('/:sessionId')
    @ApiOperation({ summary: 'Delete GamePlaySession by Id', deprecated: true })
    @ApiResponse({ status: 200, description: 'The GamePlaySession has been succesfully deleted' })
    async deleteGamePlaySessionById(@Param('sessionId', ParseIntPipe) sessionId: number) {
        return this.gamePlaySessionService.deleteGamePlaySessionById(sessionId)
    }
}
