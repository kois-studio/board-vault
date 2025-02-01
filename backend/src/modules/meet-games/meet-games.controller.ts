import { Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MeetGamesService } from './meet-games.service'
import { MeetGameDto } from '../../common/types/meet-game.type'
import { SuccessDto } from '../../common/types/auth.type'

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

    @Post(':meetId/:gameId')
    @ApiOperation({ summary: 'Create meetGames ', deprecated: false })
    @ApiResponse({ status: 200, type: MeetGameDto, description: 'The meetGames has been successfully created.' })
    @ApiResponse({ status: 404, description: 'MeetId not found.' })
    createMeetGame(@Param('meetId', ParseIntPipe) meetId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.meetGamesService.createMeetGame(meetId, gameId)
    }

    @Delete(':meetId/:gameId')
    @ApiOperation({ summary: 'Update meetGames ', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The meetGames has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'MeetId not found.' })
    updateMeetGame(@Param('meetId', ParseIntPipe) meetId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.meetGamesService.deleteMeetGame(meetId, gameId)
    }
}
