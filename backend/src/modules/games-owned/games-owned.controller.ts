import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
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
    @ApiOperation({ summary: 'Get all owned games' })
    @ApiResponse({ status: 200, type: [GameOwnedDto], description: 'List of all owned games' })
    async getGamesOwneds() {
        return this.gamesOwnedService.getGamesOwneds()
    }

    @Get('/:accountId/:gameId')
    @ApiOperation({ summary: 'Get owned game by id' })
    @ApiResponse({ status: 200, type: GameOwnedDto, description: 'OwnedGame found' })
    @ApiResponse({ status: 404, description: 'OwnedGame not found' })
    @ApiParam({ name: 'accountId', type: String })
    @ApiParam({ name: 'gameId', type: String })
    getGamesOwnedById(@Param('accountId', ParseIntPipe) accountId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.gamesOwnedService.getGamesOwnedById(accountId, gameId)
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new membership' })
    @ApiResponse({ status: 201, description: 'The owned game has been succesfully created' })
    async createGamesOwned(@Body() gameOwnedDto: GameOwnedDto) {
        return this.gamesOwnedService.createGamesOwned(gameOwnedDto)
    }

    @Delete('/:accountId/:gameId')
    @ApiOperation({ summary: 'Delete a owned game by Id' })
    @ApiResponse({ status: 200, description: 'The owned game has been succesfully deleted' })
    @ApiParam({ name: 'accountId', type: String })
    @ApiParam({ name: 'gameId', type: String })
    async deleteGamesOwnedById(@Param('accountId', ParseIntPipe) accountId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.gamesOwnedService.deleteGamesOwnedById(accountId, gameId)
    }
}
