import { Controller, Delete, Param, ParseIntPipe, Post, Req, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { SuccessDto } from '../../../common/types/auth.type'
import { MeetAccountGameDto } from '../../../common/types/meet-account-game.type'

import { MeetAccountGamesService } from './meet-account-games.service'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
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
        @Req() request: { user: { userId: number } },
        @Param('meetId', ParseIntPipe) meetId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ) {
        return this.meetAccountGamesService.createMeetAccountGameForAccount(request.user.userId, meetId, gameId)
    }

    @Delete(':accountId/:meetId/:gameId')
    @ApiOperation({ summary: 'Update meetAccountGames ', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The meetGames has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'MeetId not found.' })
    updateMeetAccountGame(
        @Req() request: { user: { userId: number } },
        @Param('meetId', ParseIntPipe) meetId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ) {
        return this.meetAccountGamesService.deleteMeetAccountGameForAccount(request.user.userId, meetId, gameId)
    }
}
