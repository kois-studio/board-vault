import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator.js'
import { UpdateGameOwnedDto } from '../../../common/types/game-owned.type.js'
import { CollectionActivityService } from '../../../modules/core/collection-activity/collection-activity.service.js'
import { GameTranslationService } from '../../../modules/core/game-translation/game-translation.service.js'
import { DatabaseService } from '../../common/database/database.service.js'
import { GameTagsService } from '../../core/game-tags/game-tags.service.js'
import { GamesService } from '../../core/games/games.service.js'
import { GamesOwnedService } from '../../core/games-owned/games-owned.service.js'
import { ReviewsService } from '../../core/reviews/reviews.service.js'
import { TagCategoryService } from '../../core/tag-category/tag-category.service.js'
import { TagsService } from '../../core/tags/tags.service.js'
import { WishlistService } from '../../core/wishlist/wishlist.service.js'

import type { SuccessDto } from '../../../common/types/auth.type.js'
import type { CollectionActivityWithGameDataDto } from '../../../common/types/collection-activity.type.js'
import type { CreateGameReviewBody, GameReviewWithGameDataDto } from '../../../common/types/game-review.type.js'
import type { BrowseGamesQuery, BrowseGamesResultDto, GameCompleteDto, GameDto, GameViewDto } from '../../../common/types/game.type.js'
import type { CatalogueTagDto } from '../../../common/types/tag.type.js'

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
    async browseCatalogue(userId: number, query: BrowseGamesQuery): Promise<BrowseGamesResultDto> {
        const search = this.gameTranslationService.normalizeTitle(query.search)

        // Punctuation alone, such as `%%`, normalizes to nothing: a search with no match, not the whole catalogue.
        if (search === '' && query.search.trim() !== '') {
            return { games: [], pagination: { currentPage: query.page, totalPages: 0, totalItems: 0, itemsPerPage: query.limit } }
        }

        const { gameIds, total } = await this.gamesService.browseCatalogue({
            search,
            players: query.players,
            length: query.length,
            tagIds: query.tags,
            hideOwnedBy: query.hideOwned ? userId : undefined,
            sort: query.sort,
            page: query.page,
            pageSize: query.limit,
        })
        const [games, translations] = await Promise.all([
            this.gamesService.getGamesByIds(gameIds),
            this.gameTranslationService.getTranslationsByGameIds(gameIds),
        ])

        return {
            games: gameIds.flatMap(gameId => {
                const game = games.get(gameId)
                const titleTranslations = translations.get(gameId)

                return game && titleTranslations ? [{ ...game, titleTranslations }] : []
            }),
            pagination: {
                currentPage: query.page,
                totalPages: Math.ceil(total / query.limit),
                totalItems: total,
                itemsPerPage: query.limit,
            },
        }
    }

    @LogFeature(new Logger('CollectionService'))
    async getCatalogueTags(): Promise<Array<CatalogueTagDto>> {
        return this.gamesService.getCatalogueTags()
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

        // Similar games: the ones sharing the most tags with this one
        const similarGameIds = await this.gamesService.getSimilarGameIds(gameId)
        const similarGames = await Promise.all(similarGameIds.map(id => this.gamesService.getSafeGameById(id)))
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
        const result = await this.databaseService.collection.addGameToCollection(userId, gameId)

        if (!result.success) {
            throw new ConflictException('This game is already in your collection')
        }

        await this.collectionActivityService.invalidateForAccount(userId)

        return { success: true }
    }

    @LogFeature(new Logger('CollectionService'))
    async removeGameFromUserCollection(userId: number, gameId: number): Promise<SuccessDto> {
        const result = await this.databaseService.collection.removeGameFromCollection(userId, gameId)

        if (result.rowsAffected === 0) {
            throw new NotFoundException(`OwnedGame with accountId ${userId} and gameId ${gameId} not found`)
        }

        await this.collectionActivityService.invalidateForAccount(userId)

        return { success: true }
    }

    @LogFeature(new Logger('CollectionService'))
    async updateGameOwnership(userId: number, gameId: number, body: UpdateGameOwnedDto) {
        const result = await this.databaseService.collection.updateGameOwnershipAndLogActivity(userId, gameId, body)

        if (result.rowsAffected === 0) {
            throw new NotFoundException(`OwnedGame with id ${userId} ${gameId} not found`)
        }

        await this.collectionActivityService.invalidateForAccount(userId)

        return this.gamesOwnedService.getGameOwnedByAccountIdAndGameId(userId, gameId)
    }

    @LogFeature(new Logger('CollectionService'))
    async toggleWishlist(accountId: number, gameId: number): Promise<boolean> {
        const isWishlisted = await this.databaseService.collection.toggleWishlistAndLogActivity(accountId, gameId)

        await this.collectionActivityService.invalidateForAccount(accountId)

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

        await this.collectionActivityService.invalidateForAccount(userId)
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
