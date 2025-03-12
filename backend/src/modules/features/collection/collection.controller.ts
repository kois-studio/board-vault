import { Controller, Get, Param, ParseIntPipe, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { CollectionService } from './collection.service'
// Guards
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
// Types
import { GameDto, GameViewDto } from '../../../common/types/game.type'
import { GameReviewWithGameDataDto } from '../../../common/types/game-review.type'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@ApiTags('collection')
@ApiBearerAuth()
@Controller('collection')
export class CollectionController {
    constructor(private readonly collectionService: CollectionService) {}

    @Get('/users/:userId/games')
    @ApiOperation({ summary: 'Get all games owned by a user', deprecated: false })
    @ApiResponse({ status: 200, type: [GameDto], description: 'List of all games owned by the user' })
    async getGamesOwnedByUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.collectionService.getGamesOwnedByUser(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/games/:gameId')
    @ApiOperation({ summary: 'Game view for a user (not owned necessarily)', deprecated: false })
    @ApiResponse({ status: 200, type: GameViewDto, description: 'Game view for the user' })
    async getGameViewByUserId(@Param('userId', ParseIntPipe) userId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.collectionService.getGameViewByUserId(userId, gameId)
    }

    @Get('/users/:userId/games/reviews')
    @ApiOperation({ summary: 'Get all reviews of a user', deprecated: false })
    @ApiResponse({ status: 200, type: [GameReviewWithGameDataDto], description: 'List of all reviews of the user' })
    async getReviewsOfUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.collectionService.getReviewsOfUser(userId)
    }
}
