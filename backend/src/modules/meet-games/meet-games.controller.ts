import { Controller, Get, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { MeetGamesService } from './meet-games.service'
import { MeetGameDto } from '../../common/types/meet-game.type'

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
}
