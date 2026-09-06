import { ConflictException, Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { UpdateGameOwnedDto } from '../../../common/types/game-owned.type'
import { CollectionActivityService } from '../../../modules/core/collection-activity/collection-activity.service'
import { GameTranslationService } from '../../../modules/core/game-translation/game-translation.service'
import { DatabaseService } from '../../common/database/database.service'
import { GameTagsService } from '../../core/game-tags/game-tags.service'
import { GamesService } from '../../core/games/games.service'
import { GamesOwnedService } from '../../core/games-owned/games-owned.service'
import { ReviewsService } from '../../core/reviews/reviews.service'
import { TagCategoryService } from '../../core/tag-category/tag-category.service'
import { TagsService } from '../../core/tags/tags.service'
import { WishlistService } from '../../core/wishlist/wishlist.service'

import type { SuccessDto } from '../../../common/types/auth.type'
import type { CollectionActivityWithGameDataDto } from '../../../common/types/collection-activity.type'
import type { CreateGameReviewBody, GameReviewWithGameDataDto } from '../../../common/types/game-review.type'
import type { BrowseGamesResultDto, GameCompleteDto, GameDto, GameViewDto } from '../../../common/types/game.type'

@Injectable()
export class CollectionService {
    constructor(
        private readonly gamesService: GamesService,
        private readonly tagsService: TagsService,
        private readonly gameTagsService: GameTagsService,
        private readonly reviewsService: ReviewsService,
        private readonly wishlistService: WishlistService,
        private readonly gamesOwnedService: GamesOwnedService,
        private readonly tagCategoriesService: TagCategoryService,
        private readonly gameTranslationService: GameTranslationService,
        private readonly collectionActivityService: CollectionActivityService,
        private readonly databaseService: DatabaseService,
    ) {}

    @LogFeature(new Logger('CollectionService'))
    async getGamesOwnedByUser(userId: number): Promise<Array<GameCompleteDto>> {
        const gamesOwned = await this.gamesOwnedService.getGamesOwnedByAccountId(userId)
        const games = await Promise.all(gamesOwned.map(async game => this.gamesService.getGameById(game.gameId)))

        return Promise.all(
            games.map(async game => ({
                ...game,
                titleTranslations: await this.gameTranslationService.getGameTranslations(game.id),
            })),
        )
    }

    @LogFeature(new Logger('CollectionService'))
    async getGamesNotOwnedByUser(userId: number, search: string, page: number, limit: number): Promise<BrowseGamesResultDto> {
        const result = await this.gameTranslationService.browseGamesByTitle({
            search,
            page,
            pageSize: limit,
            excludeGameIds: [], // this was implemented to only show the games the user doesn't own, but now we show them with an icon
        })

        const gamesWithTranslations = await Promise.all(
            result.gameIds.map(async gameId => ({
                ...(await this.gamesService.getGameById(gameId)),
                titleTranslations: await this.gameTranslationService.getGameTranslations(gameId),
            })),
        )

        return {
            games: gamesWithTranslations,
            pagination: {
                currentPage: result.currentPage,
                totalPages: result.totalPages,
                totalItems: result.totalItems,
                itemsPerPage: result.itemsPerPage,
            },
        }
    }

    @LogFeature(new Logger('CollectionService'))
    async getGameViewByUserId(userId: number, gameId: number): Promise<GameViewDto> {
        // Step 1: Get each part of data needed in the view
        const gameData = await this.gamesService.getGameById(gameId)
        const titleTranslations = await this.gameTranslationService.getGameTranslations(gameId)
        const gameTags = await this.gameTagsService.getGameTags(gameId)
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

        // Tags
        const tags = await Promise.all(gameTags.map(async tag => this.tagsService.getTagById(tag.tagId)))
        const tagsWithCategory = await Promise.all(
            tags.map(async tag => ({
                ...tag,
                category: await this.tagCategoriesService.getTagCategoryById(tag.categoryId),
            })),
        )

        // Step 2: Construct the GameView
        return {
            gameData: {
                ...gameData,
                titleTranslations,
            },
            ownedGameData: !ownedGameData
                ? null
                : {
                      purchaseDate: ownedGameData.purchaseDate,
                      purchasePrice: ownedGameData.purchasePrice,
                      purchaseNotes: ownedGameData.purchaseNotes,
                  },
            tags: tagsWithCategory.map(tag => ({
                tag: tag.name,
                category: tag.category.name,
            })),
            wishlistedGameData: wishlistGameData
                ? {
                      dateAdded: '',
                      notes: '',
                  }
                : null,
            ratingData: {
                userRating: myReview?.review ?? null,
                avgGroupsRating,
                avgGlobalRating,
            },
            similarGames: await Promise.all(
                similarGamesFiltered.map(async game => ({
                    ...game,
                    titleTranslations: await this.gameTranslationService.getGameTranslations(game.id),
                })),
            ),
        }
    }

    @LogFeature(new Logger('CollectionService'))
    async addGameToUserCollection(userId: number, gameId: number): Promise<SuccessDto> {
        const result = await this.databaseService.addGameToCollection(userId, gameId)

        if (!result.success) {
            throw new ConflictException('This game is already in your collection')
        }

        await this.collectionActivityService.invalidateForAccount(userId)

        return { success: true }
    }

    @LogFeature(new Logger('CollectionService'))
    async removeGameFromUserCollection(userId: number, gameId: number): Promise<SuccessDto> {
        const result = await this.gamesOwnedService.deleteGamesOwnedById(userId, gameId)

        if (result.success) {
            await this.collectionActivityService.logCollectionActivity(userId, gameId, 'removed', null)
        }

        return { success: result.success }
    }

    @LogFeature(new Logger('CollectionService'))
    async updateGameOwnership(userId: number, gameId: number, body: UpdateGameOwnedDto) {
        const updatedGameOwned = await this.gamesOwnedService.updateGameOwned(userId, gameId, body)

        await this.collectionActivityService.logCollectionActivity(userId, gameId, 'updated', null)

        return updatedGameOwned
    }

    @LogFeature(new Logger('CollectionService'))
    async toggleWishlist(accountId: number, gameId: number): Promise<boolean> {
        const isWishlisted = await this.wishlistService.toggleWishlist(accountId, gameId)
        const actionType = isWishlisted ? 'wishlisted' : 'unwishlisted'

        await this.collectionActivityService.logCollectionActivity(accountId, gameId, actionType, null)

        return isWishlisted
    }

    @LogFeature(new Logger('CollectionService'))
    async getReviewsOfUser(userId: number): Promise<Array<GameReviewWithGameDataDto>> {
        const reviews = await this.reviewsService.getUserReviews(userId)

        return Promise.all(
            reviews.map(async review => {
                const game = await this.gamesService.getGameById(review.gameId)
                const titleTranslations = await this.gameTranslationService.getGameTranslations(game.id)

                return {
                    ...review,
                    gameData: { ...game, titleTranslations },
                }
            }),
        )
    }

    @LogFeature(new Logger('CollectionService'))
    async saveGameReview(userId: number, gameId: number, gameReviewDto: CreateGameReviewBody): Promise<SuccessDto> {
        const result = await this.reviewsService.saveGameReview(userId, gameId, gameReviewDto.review)

        if (result.success) {
            await this.collectionActivityService.logCollectionActivity(userId, gameId, 'rated', { rating: gameReviewDto.review })
        }

        return result
    }

    @LogFeature(new Logger('CollectionService'))
    async getUserWishlist(userId: number): Promise<Array<GameCompleteDto>> {
        const wishlist = await this.wishlistService.getWishlistByAccountId(userId)
        const games = await Promise.all(wishlist.map(async gameId => this.gamesService.getGameById(gameId)))

        return Promise.all(
            games.map(async game => ({
                ...game,
                titleTranslations: await this.gameTranslationService.getGameTranslations(game.id),
            })),
        )
    }

    @LogFeature(new Logger('CollectionService'))
    async getUserCollectionActivities(userId: number): Promise<Array<CollectionActivityWithGameDataDto>> {
        const activities = await this.collectionActivityService.getUserCollectionActivities(userId)

        return Promise.all(
            activities.map(async activity => {
                const game = await this.gamesService.getGameById(activity.gameId)
                const titleTranslations = await this.gameTranslationService.getGameTranslations(game.id)

                return { ...activity, gameData: { ...game, titleTranslations } }
            }),
        )
    }
}
