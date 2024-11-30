import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MeetGamesService } from './meet-games.service'
import { MeetGameDto, UpdateMeetGameBody } from '../../common/types/meet-game.type'

@UseGuards(JwtAuthGuard)
@ApiTags('meetGames')
@ApiBearerAuth()
@Controller('meetGames')
export class MeetGamesController {
    constructor(private readonly meetGamesService: MeetGamesService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all meet games', deprecated: true })
    @ApiResponse({ status: 200, type: [MeetGameDto], description: 'List of all meet games' })
    async getMeetGames() {
        return this.meetGamesService.getMeetGames()
    }

    @Get('/:meetId')
    @ApiOperation({ summary: 'Get meet games by MeetId', deprecated: false })
    @ApiResponse({ status: 200, type: [MeetGameDto], description: 'List of meet games by meetId' })
    async getMeetGameByMeetId(@Param('meetId', ParseIntPipe) meetId: number) {
        return this.meetGamesService.getMeetGameByMeetId(meetId)
    }

    @Put(':meetId/:gameId')
    @ApiOperation({ summary: 'Update meetGames ', deprecated: false })
    @ApiResponse({ status: 200, description: 'The meetGames has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'MeetId not found.' })
    updateMeetGame(
        @Param('meetId', ParseIntPipe) meetId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
        @Body() partialMeetGame: UpdateMeetGameBody,
    ) {
        return this.meetGamesService.updateMeetGame(gameId, meetId, partialMeetGame)
    }
}
