import { Body, Controller, Delete, Get, Param, ParseIntPipe, Post, Put, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { CreateGameBody, GameDto, UpdateGameBody } from '../../../common/types/game.type'

import { GamesService } from './games.service'

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

    @Post('/')
    @ApiOperation({ summary: 'Create a new game', deprecated: true })
    @ApiResponse({ status: 201, description: 'The game has been succesfully created' })
    async createGame(@Body() gameDto: CreateGameBody) {
        return this.gamesService.createGame(gameDto)
    }

    @Get('/:gameId')
    @ApiOperation({ summary: 'Get game by id', deprecated: true })
    @ApiResponse({ status: 200, type: GameDto, description: 'Game found' })
    @ApiResponse({ status: 404, description: 'Game not found' })
    getGameById(@Param('gameId', ParseIntPipe) gameId: number) {
        return this.gamesService.getGameById(gameId)
    }

    @Put(':gameId')
    @ApiOperation({ summary: 'Update a game by ID', deprecated: true })
    @ApiResponse({ status: 200, description: 'The game has been successfully updated.' })
    @ApiResponse({ status: 404, description: 'Game not found.' })
    updateGame(@Param('gameId', ParseIntPipe) gameId: number, @Body() partialGameDto: UpdateGameBody) {
        return this.gamesService.updateGame(gameId, partialGameDto)
    }

    @Delete('/:gameId')
    @ApiOperation({ summary: 'Delete a game by Id', deprecated: true })
    @ApiResponse({ status: 200, description: 'The game has been succesfully deleted' })
    async deleteGameById(@Param('gameId', ParseIntPipe) gameId: number) {
        return this.gamesService.deleteGameById(gameId)
    }
}
