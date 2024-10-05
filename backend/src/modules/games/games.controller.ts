import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger'
import { GamesService } from './games.service'
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard'
import { CreateGameBody, GameDto, UpdateGameBody } from '../../common/types/shared/game.type'

@UseGuards(JwtAuthGuard)
@ApiTags('games')
@ApiBearerAuth()
@Controller('games')
export class GamesController {
    constructor(private readonly gamesService: GamesService) {}

    @Get('/')
    @ApiOperation({ summary: 'Get all games' })
    @ApiResponse({ status: 200, type: [GameDto], description: 'List of all games' })
    async getGames() {
        return this.gamesService.getGames()
    }

    @Get('/:gameId')
    @ApiOperation({ summary: 'Get game by id' })
    @ApiResponse({ status: 200, type: GameDto, description: 'Game found' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    @ApiParam({ name: 'gameId', type: String })
    getGameById(@Param('gameId', ParseIntPipe) gameId: number) {
        return this.gamesService.getGameById(gameId)
    }

    @Post('/')
    @ApiOperation({ summary: 'Create a new game' })
    @ApiResponse({ status: 201, description: 'The game has been succesfully created' })
    async createGame(@Body() gameDto: CreateGameBody) {
        return this.gamesService.createGame(gameDto)
    }

    @Put(':gameId')
    @ApiOperation({ summary: 'Update a game by ID' })
    @ApiParam({ name: 'gameId', required: true, description: 'Game ID' })
    @ApiBody({ type: UpdateGameBody, description: 'Partial or full game object to update' })
    @ApiResponse({ status: 200, description: 'The game has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'Game not found.' })
    updateGame(@Param('gameId', ParseIntPipe) gameId: number, @Body() partialGameDto: UpdateGameBody) {
        return this.gamesService.updateGame(gameId, partialGameDto)
    }

    @Delete('/:gameId')
    @ApiOperation({ summary: 'Delete a game by Id' })
    @ApiResponse({ status: 200, description: 'The game has been succesfully deleted' })
    @ApiParam({ name: 'gameId', type: String, description: 'ID of the game to be deleted' })
    async deleteGameById(@Param('gameId', ParseIntPipe) gameId: number) {
        return this.gamesService.deleteGameById(gameId)
    }

    // TODO: for a userId -> get all games owned
}
