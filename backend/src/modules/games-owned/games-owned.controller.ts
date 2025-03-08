import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { GamesOwnedService } from './games-owned.service'
import { GameOwnedDto } from '../../common/types/game-owned.type'

@UseGuards(JwtAuthGuard)
@ApiTags('gamesOwned')
@ApiBearerAuth()
@Controller('gamesOwned')
export class GamesOwnedController {
    constructor(private readonly gamesOwnedService: GamesOwnedService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all owned games', deprecated: true })
    @ApiResponse({ status: 200, type: [GameOwnedDto], description: 'List of all owned games' })
    async getGamesOwneds() {
        return this.gamesOwnedService.getGamesOwneds()
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new membership', deprecated: true })
    @ApiResponse({ status: 201, description: 'The owned game has been succesfully created' })
    async createGamesOwned(@Body() gameOwnedDto: GameOwnedDto) {
        return this.gamesOwnedService.createGamesOwned(gameOwnedDto)
    }

    @Get('/:accountId/:gameId')
    @ApiOperation({ summary: 'Get owned game by id', deprecated: true })
    @ApiResponse({ status: 200, type: GameOwnedDto, description: 'OwnedGame found' })
    @ApiResponse({ status: 404, description: 'OwnedGame not found' })
    isGameIdOwnedByAccountId(@Param('accountId', ParseIntPipe) accountId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.gamesOwnedService.isGameIdOwnedByAccountId(accountId, gameId)
    }

    @Delete('/:accountId/:gameId')
    @ApiOperation({ summary: 'Delete a owned game by Id', deprecated: true })
    @ApiResponse({ status: 200, description: 'The owned game has been succesfully deleted' })
    async deleteGamesOwnedById(@Param('accountId', ParseIntPipe) accountId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.gamesOwnedService.deleteGamesOwnedById(accountId, gameId)
    }
}
