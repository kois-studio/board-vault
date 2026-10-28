import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator.js'
import { compareNames } from '../../../common/i18n/locale.js'
import { AddGameToCollectionBody, UpdateGameOwnedDto } from '../../../common/types/game-owned.type.js'
import { CollectionActivityService } from '../../../modules/core/collection-activity/collection-activity.service.js'
import { GameTranslationService } from '../../../modules/core/game-translation/game-translation.service.js'
import { DatabaseService } from '../../common/database/database.service.js'
import { GamesService } from '../../core/games/games.service.js'
import { GamesOwnedService } from '../../core/games-owned/games-owned.service.js'
import { ActivityNotifier } from '../../core/notifications/activity-notifier.service.js'
import { ReviewsService } from '../../core/reviews/reviews.service.js'
import { WishlistService } from '../../core/wishlist/wishlist.service.js'

import type { Locale } from '../../../common/i18n/locale.js'
import type { SuccessDto } from '../../../common/types/auth.type.js'
import type { CollectionActivityWithGameDataDto } from '../../../common/types/collection-activity.type.js'
import type { CreateGameReviewBody, GameReviewWithGameDataDto } from '../../../common/types/game-review.type.js'
import type {
    BrowseGamesQuery,
    BrowseGamesResultDto,
    GameCompleteDto,
    GameDto,
    GameEditionChoiceDto,
    GameViewDto,
    OwnedGameCompleteDto,
} from '../../../common/types/game.type.js'
import type { CatalogueTagDto } from '../../../common/types/tag.type.js'

@Injectable()
export class CollectionService {
    constructor(
        private readonly gamesService: GamesService,
        private readonly reviewsService: ReviewsService,
        private readonly wishlistService: WishlistService,
        private readonly gamesOwnedService: GamesOwnedService,
        private readonly gameTranslationService: GameTranslationService,
        private readonly collectionActivityService: CollectionActivityService,
        private readonly databaseService: DatabaseService,
        private readonly activityNotifier: ActivityNotifier,
    ) {}

    @LogFeature(new Logger('CollectionService'))
    async getGamesOwnedByUser(userId: number, locale: Locale): Promise<Array<OwnedGameCompleteDto>> {
        const gamesOwned = await this.gamesOwnedService.getGamesOwnedByAccountId(userId)
        const games = await Promise.all(gamesOwned.map(async game => this.gamesService.getGameById(game.gameId)))
        const [titled, ownedTitles] = await Promise.all([
            this.gameTranslationService.withTitles(games, locale),
            this.databaseService.collection.getOwnedTitlesByAccountId(userId, locale),
        ])
        // ADR-0025 rule 1: a copy shows the title of the edition its owner said they own.
        const copies = new Map(ownedTitles.rows.map(row => [Number(row[0]), row]))

        return titled.map(game => {
            const copy = copies.get(game.id)
            const ownedEditionId = copy?.[1] === null || copy?.[1] === undefined ? null : Number(copy[1])

            return ownedEditionId === null
                ? { ...game, ownedEditionId }
                : { ...game, title: String(copy?.[2]), titleLanguage: String(copy?.[3]), ownedEditionId }
        })
    }

    /** The editions of a game, the primary one first, for choosing which one a copy is. */
    @LogFeature(new Logger('CollectionService'))
    async getGameEditions(gameId: number): Promise<Array<GameEditionChoiceDto>> {
        const result = await this.databaseService.collection.getGameEditions(gameId)

        return result.rows.map(row => ({
            id: Number(row[0]),
            languageCode: String(row[1]),
            title: String(row[2]),
            isPrimary: Number(row[3]) === 1,
        }))
    }

    /**
     * The edition to store for a copy: the one asked for, which must belong to the game; null (not said)
     * when none is asked for.
     */
    private async checkEditionOfGame(gameId: number, editionId: number | null | undefined): Promise<number | null> {
        if (editionId === null || editionId === undefined) return null

        if (!(await this.getGameEditions(gameId)).some(edition => edition.id === editionId)) {
            throw new BadRequestException('That edition belongs to another game')
        }

        return editionId
    }

    @LogFeature(new Logger('CollectionService'))
    async browseCatalogue(userId: number, query: BrowseGamesQuery, locale: Locale): Promise<BrowseGamesResultDto> {
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
            locale,
        })
        const games = await this.gamesService.getGamesByIds(gameIds)
        const found = gameIds.flatMap(gameId => games.get(gameId) ?? [])

        return {
            games: await this.gameTranslationService.withTitles(found, locale),
            pagination: {
                currentPage: query.page,
                totalPages: Math.ceil(total / query.limit),
                totalItems: total,
                itemsPerPage: query.limit,
            },
        }
    }

    @LogFeature(new Logger('CollectionService'))
    async getCatalogueTags(locale: Locale): Promise<Array<CatalogueTagDto>> {
        return this.gamesService.getCatalogueTags(locale)
    }

    @LogFeature(new Logger('CollectionService'))
    async getGameViewByUserId(userId: number, gameId: number, locale: Locale): Promise<GameViewDto> {
        // Step 1: Get each part of data needed in the view
        const gameData = await this.gamesService.getGameById(gameId)
        const ownedGameData = await this.gamesOwnedService.isGameIdOwnedByAccountId(userId, gameId, false)
        const wishlistGameData = await this.wishlistService.isGameWishlisted(userId, gameId)
        const editions = await this.getGameEditions(gameId)
        // reviews
        const myReview = await this.reviewsService.getSafeGameReviewsById(userId, gameId)
        const avgGroupsRating = await this.reviewsService.getAvgGroupsRating(userId, gameId)
        const avgGlobalRating = await this.reviewsService.getAvgGlobalRating(gameId)

        // Similar games: the ones sharing the most tags with this one
        const similarGameIds = await this.gamesService.getSimilarGameIds(gameId)
        const similarGames = await Promise.all(similarGameIds.map(id => this.gamesService.getSafeGameById(id)))
        const similarGamesFiltered = similarGames.filter(Boolean) as Array<GameDto>

        // Tags, in the reader's language, by category and then name
        const compare = compareNames(locale)
        const tags = (await this.databaseService.games.getGameTagNames(gameId, locale)).rows
            .map(row => ({ tag: String(row['name']), category: String(row['categoryName']) }))
            .sort((a, b) => compare(a.category, b.category) || compare(a.tag, b.tag))

        // Step 2: Construct the GameView
        const [gameWithTitles] = await this.gameTranslationService.withTitles([gameData], locale)
        // Rule 1 for "your copy": the title of the edition the reader owns, else the one the game shows.
        const ownedEdition = editions.find(edition => edition.id === ownedGameData?.editionId)

        return {
            gameData: gameWithTitles!,
            ownedGameData: !ownedGameData
                ? null
                : {
                      purchaseDate: ownedGameData.purchaseDate,
                      purchasePrice: ownedGameData.purchasePrice,
                      purchaseNotes: ownedGameData.purchaseNotes,
                      editionId: ownedEdition?.id ?? null,
                      title: ownedEdition?.title ?? gameWithTitles!.title,
                      titleLanguage: ownedEdition?.languageCode ?? gameWithTitles!.titleLanguage,
                  },
            tags,
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
            editions,
            similarGames: await this.gameTranslationService.withTitles(similarGamesFiltered, locale),
        }
    }

    @LogFeature(new Logger('CollectionService'))
    async addGameToUserCollection(userId: number, gameId: number, body?: AddGameToCollectionBody): Promise<SuccessDto> {
        const editionId = await this.checkEditionOfGame(gameId, body?.editionId)
        const result = await this.databaseService.collection.addGameToCollection(userId, gameId, editionId)

        if (!result.success) {
            throw new ConflictException('This game is already in your collection')
        }

        await this.collectionActivityService.invalidateForAccount(userId)
        await this.activityNotifier.shelfChanged(userId, { added: [gameId] })

        return { success: true }
    }

    /** Says which edition a copy on the shelf is, or clears it (null); the edition must belong to the game. */
    @LogFeature(new Logger('CollectionService'))
    async setOwnedEdition(userId: number, gameId: number, editionId: number | null): Promise<SuccessDto> {
        const checked = await this.checkEditionOfGame(gameId, editionId)

        if ((await this.databaseService.collection.setOwnedEdition(userId, gameId, checked)) === 0) {
            throw new NotFoundException(`OwnedGame with accountId ${userId} and gameId ${gameId} not found`)
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
        await this.activityNotifier.shelfChanged(userId, { removed: [gameId] })

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
    async getReviewsOfUser(userId: number, locale: Locale): Promise<Array<GameReviewWithGameDataDto>> {
        const reviews = await this.reviewsService.getUserReviews(userId)
        const games = await Promise.all(reviews.map(async review => this.gamesService.getGameById(review.gameId)))
        const titled = new Map((await this.gameTranslationService.withTitles(games, locale)).map(game => [game.id, game]))

        return reviews.flatMap(review => {
            const gameData = titled.get(review.gameId)

            return gameData ? [{ ...review, gameData }] : []
        })
    }

    @LogFeature(new Logger('CollectionService'))
    async saveGameReview(userId: number, gameId: number, gameReviewDto: CreateGameReviewBody): Promise<SuccessDto> {
        const result = await this.reviewsService.saveGameReview(userId, gameId, gameReviewDto.review)

        await this.collectionActivityService.invalidateForAccount(userId)
        return result
    }

    @LogFeature(new Logger('CollectionService'))
    async getUserWishlist(userId: number, locale: Locale): Promise<Array<GameCompleteDto>> {
        const wishlist = await this.wishlistService.getWishlistByAccountId(userId)
        const games = await Promise.all(wishlist.map(async gameId => this.gamesService.getGameById(gameId)))

        return this.gameTranslationService.withTitles(games, locale)
    }

    @LogFeature(new Logger('CollectionService'))
    async getUserCollectionActivities(userId: number, locale: Locale): Promise<Array<CollectionActivityWithGameDataDto>> {
        const activities = await this.collectionActivityService.getUserCollectionActivities(userId)
        const games = await Promise.all(activities.map(async activity => this.gamesService.getGameById(activity.gameId)))
        const titled = new Map((await this.gameTranslationService.withTitles(games, locale)).map(game => [game.id, game]))

        return activities.flatMap(activity => {
            const gameData = titled.get(activity.gameId)

            return gameData ? [{ ...activity, gameData }] : []
        })
    }
}
