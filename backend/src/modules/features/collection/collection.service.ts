import { Injectable, Logger } from '@nestjs/common'
import { LogFeature } from '../../../common/decorators/logger.decorator'
import type { GameReviewWithGameDataDto } from '../../../common/types/game-review.type'
import type { GameDto, GameViewDto } from '../../../common/types/game.type'
// Services
import { UsersService } from '../../users/users.service'
import { GamesService } from '../../core/games/games.service'
import { TagsService } from '../../core/tags/tags.service'
import { ReviewsService } from '../../core/reviews/reviews.service'
import { WishlistService } from '../../core/wishlist/wishlist.service'
import { GamesOwnedService } from '../../core/games-owned/games-owned.service'
import { UpdateGameOwnedDto } from 'src/common/types/game-owned.type'

@Injectable()
export class CollectionService {
    constructor(
        private readonly usersService: UsersService,
        private readonly gamesService: GamesService,
        private readonly tagsService: TagsService,
        private readonly reviewsService: ReviewsService,
        private readonly wishlistService: WishlistService,
        private readonly gamesOwnedService: GamesOwnedService,
    ) {}

    @LogFeature(new Logger('CollectionService'))
    async getGamesOwnedByUser(userId: number): Promise<Array<GameDto>> {
        const gamesOwned = await this.gamesOwnedService.getGamesOwnedByAccountId(userId)
        return Promise.all(gamesOwned.map(async game => this.gamesService.getGameById(game.gameId)))
    }

    @LogFeature(new Logger('CollectionService'))
    async getGameViewByUserId(userId: number, gameId: number): Promise<GameViewDto> {
        // Step 1: Get each part of data needed in the view
        const gameData = await this.gamesService.getGameById(gameId)
        const gameTags = await this.tagsService.getGameTags(gameId)
        const ownedGameData = await this.gamesOwnedService.isGameIdOwnedByAccountId(userId, gameId, false)
        const wishlistGameData = await this.wishlistService.isGameWishlisted(userId, gameId)
        // reviews
        const myReview = await this.reviewsService.getSafeGameReviewsById(userId, gameId)
        const avgGroupsRating = await this.reviewsService.getAvgGroupsRating(userId, gameId)
        const avgGlobalRating = await this.reviewsService.getAvgGlobalRating(gameId)

        // Get similar games
        const similarGames = (
            await Promise.all([
                this.gamesService.getSafeGameById(gameId + 2),
                this.gamesService.getSafeGameById(gameId + 1),
                this.gamesService.getSafeGameById(gameId - 1),
                this.gamesService.getSafeGameById(gameId - 2),
            ])
        ).filter(Boolean)
        const similarGamesFiltered = similarGames.filter(Boolean) as Array<GameDto>

        // Step 2: Construct the GameView
        return {
            gameData: gameData,
            ownedGameData: !ownedGameData
                ? null
                : {
                      purchaseDate: ownedGameData.purchaseDate,
                      purchasePrice: ownedGameData.purchasePrice,
                      purchaseNotes: ownedGameData.purchaseNotes,
                  },
            tags: gameTags,
            wishlistedGameData: wishlistGameData
                ? {
                      dateAdded: '',
                      notes: '',
                  }
                : null,
            ratingData: {
                userRating: myReview?.review ?? null,
                avgGroupsRating: avgGroupsRating,
                avgGlobalRating: avgGlobalRating,
            },
            playHistory: [], // TODO: implement game history
            similarGames: similarGamesFiltered,
        }
    }

    async updateGameOwnership(userId: number, gameId: number, body: UpdateGameOwnedDto) {
        const updatedGameOwned = await this.gamesOwnedService.updateGameOwned(userId, gameId, body)
        return updatedGameOwned
    }

    @LogFeature(new Logger('CollectionService'))
    async getReviewsOfUser(userId: number): Promise<Array<GameReviewWithGameDataDto>> {
        const reviews = await this.reviewsService.getUserReviews(userId)
        return Promise.all(
            reviews.map(async review => {
                const game = await this.gamesService.getGameById(review.gameId)
                return { ...review, gameData: game }
            }),
        )
    }
}
