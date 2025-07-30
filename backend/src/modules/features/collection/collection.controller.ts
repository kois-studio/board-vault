import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'

import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard'
import { UserOwnershipGuard } from '../../../common/guards/ownership.guard'
import { VerifiedUserGuard } from '../../../common/guards/verified-user.guard'
import { SuccessDto } from '../../../common/types/auth.type'
import { CollectionActivityDto } from '../../../common/types/collection-activity.type'
import { GameOwnedDto, UpdateGameOwnedDto } from '../../../common/types/game-owned.type'
import { CreateGameReviewBody, GameReviewWithGameDataDto } from '../../../common/types/game-review.type'
import { BrowseGamesResultDto, GameCompleteDto, GameDto, GameViewDto } from '../../../common/types/game.type'
import { WishlistResponseDto } from '../../../common/types/wishlisted-game.type'

import { CollectionService } from './collection.service'

@UseGuards(JwtAuthGuard, VerifiedUserGuard)
@ApiTags('collection')
@ApiBearerAuth()
@Controller('collection')
export class CollectionController {
    constructor(private readonly collectionService: CollectionService) {}

    @Get('/users/:userId/games')
    @ApiOperation({ summary: 'Get all games owned by a user', deprecated: false })
    @ApiResponse({ status: 200, type: [GameCompleteDto], description: 'List of all games owned by the user' })
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

    @UseGuards(UserOwnershipGuard)
    @Post('/users/:userId/games/:gameId')
    @ApiOperation({ summary: "Add a game to a user's collection", deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: "Game added to the user's collection" })
    async addGameToUserCollection(@Param('userId', ParseIntPipe) userId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.collectionService.addGameToUserCollection(userId, gameId)
    }

    @UseGuards(UserOwnershipGuard)
    @Delete('/users/:userId/games/:gameId')
    @ApiOperation({ summary: "Remove a game from a user's collection", deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: "Game removed from the user's collection" })
    async removeGameFromUserCollection(@Param('userId', ParseIntPipe) userId: number, @Param('gameId', ParseIntPipe) gameId: number) {
        return this.collectionService.removeGameFromUserCollection(userId, gameId)
    }

    @UseGuards(UserOwnershipGuard)
    @Patch('/users/:userId/games/:gameId/ownership')
    @ApiOperation({ summary: 'Update ownership details of a game', deprecated: false })
    @ApiResponse({ status: 200, type: GameOwnedDto, description: 'Updated game ownership details' })
    async updateGameOwnership(
        @Param('userId', ParseIntPipe) userId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
        @Body() body: UpdateGameOwnedDto,
    ) {
        return this.collectionService.updateGameOwnership(userId, gameId, body)
    }

    @UseGuards(UserOwnershipGuard)
    @Put('/users/:userId/games/:gameId/wishlist')
    @ApiOperation({ summary: 'Toggle the wishlist status of the game', deprecated: false })
    @ApiResponse({ status: 200, type: WishlistResponseDto })
    async toggleWishlist(
        @Param('userId', ParseIntPipe) userId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
    ): Promise<WishlistResponseDto> {
        const isWishlisted = await this.collectionService.toggleWishlist(userId, gameId)

        return { isWishlisted }
    }

    @Get('/users/:userId/games/browse')
    @ApiOperation({ summary: 'Browse games not owned by a user', deprecated: false })
    @ApiResponse({ status: 200, type: [BrowseGamesResultDto], description: 'List of all games not owned by the user' })
    async getGamesNotOwnedByUser(
        @Param('userId', ParseIntPipe) userId: number,
        @Query('search') search: string = '',
        @Query('page', ParseIntPipe) page: number = 1,
        @Query('limit', ParseIntPipe) limit: number = 20,
    ) {
        return this.collectionService.getGamesNotOwnedByUser(userId, search, page, limit)
    }

    @Get('/users/:userId/reviews')
    @ApiOperation({ summary: 'Get all reviews of a user', deprecated: false })
    @ApiResponse({ status: 200, type: [GameReviewWithGameDataDto], description: 'List of all reviews of the user' })
    async getReviewsOfUser(@Param('userId', ParseIntPipe) userId: number) {
        return this.collectionService.getReviewsOfUser(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Post('/users/:userId/reviews/:gameId')
    @ApiOperation({ summary: 'Save a game review', deprecated: false })
    @ApiResponse({ status: 200, type: SuccessDto, description: 'The review has been succesfully saved' })
    async saveGameReview(
        @Param('userId', ParseIntPipe) userId: number,
        @Param('gameId', ParseIntPipe) gameId: number,
        @Body() gameReviewDto: CreateGameReviewBody,
    ) {
        return this.collectionService.saveGameReview(userId, gameId, gameReviewDto)
    }

    @Get('/users/:userId/wishlist')
    @ApiOperation({ summary: 'Get all wishlist of a user', deprecated: false })
    @ApiResponse({ status: 200, type: [GameDto], description: 'List of all wishlist of the user' })
    async getUserWishlist(@Param('userId', ParseIntPipe) userId: number) {
        return this.collectionService.getUserWishlist(userId)
    }

    @UseGuards(UserOwnershipGuard)
    @Get('/users/:userId/recent-activity')
    @ApiOperation({ summary: "Get all recent activity of a user's collection", deprecated: false })
    @ApiResponse({ status: 200, type: [CollectionActivityDto], description: 'List of all recent activity of the user' })
    async getUserCollectionActivities(@Param('userId', ParseIntPipe) userId: number) {
        return this.collectionService.getUserCollectionActivities(userId)
    }
}
