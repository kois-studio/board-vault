import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MeetAccountGamesService } from './meet-account-games.service'
import { MeetAccountGameDto } from '../../common/types/meet-account-game.type'
import { SuccessDto } from '../../common/types/auth.type'

@UseGuards(JwtAuthGuard)
@ApiTags('meetAccountGames')
@ApiBearerAuth()
@Controller('meetAccountGames')
export class MeetAccountGamesController {
    constructor(private readonly meetAccountGamesService: MeetAccountGamesService) {}

    @Post(':accountId/:meetId/:gameId')
    @ApiOperation({ summary: 'Create meetAccountGames ', deprecated: false })
    @ApiResponse({ status: 200, type: MeetAccountGameDto, description: 'The meetAccountGames has been successfully created.' })
    @ApiResponse({ status: 404, description: 'MeetId not found.' })
    createMeetAccountGame(
        @Param('accountId', ParseIntPipe) accountId: number,
        @Param('meetId', ParseIntPipe) meetId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ) {
        return this.meetAccountGamesService.createMeetAccountGame(accountId, meetId, gameId)
    }

    @Delete(':accountId/:meetId/:gameId')
    @ApiOperation({ summary: 'Update meetAccountGames ', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The meetGames has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'MeetId not found.' })
    updateMeetAccountGame(
        @Param('accountId', ParseIntPipe) accountId: number,
        @Param('meetId', ParseIntPipe) meetId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ) {
        return this.meetAccountGamesService.deleteMeetAccountGame(accountId, meetId, gameId)
    }
}
