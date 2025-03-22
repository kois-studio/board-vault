import { Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { UpdateGameOwnedDto } from '../../../common/types/game-owned.type'
import { CollectionActivityService } from '../../../modules/core/collection-activity/collection-activity.service'
import { GamesService } from '../../core/games/games.service'
import { GamesOwnedService } from '../../core/games-owned/games-owned.service'
import { GroupsService } from '../../core/groups/groups.service'
import { MeetAccountGamesService } from '../../core/meet-account-games/meet-account-games.service'
import { MeetsService } from '../../core/meets/meets.service'
import { ReviewsService } from '../../core/reviews/reviews.service'
import { TagsService } from '../../core/tags/tags.service'
import { UsersService } from '../../core/users/users.service'
import { WishlistService } from '../../core/wishlist/wishlist.service'

import type { SuccessDto } from '../../../common/types/auth.type'
import type { CollectionActivityWithGameDataDto } from '../../../common/types/collection-activity.type'
import type { CreateGameReviewBody, GameReviewWithGameDataDto } from '../../../common/types/game-review.type'
import type { GameDto, GameViewDto } from '../../../common/types/game.type'

@Injectable()
export class CollectionService {
    constructor(
        private readonly usersService: UsersService,
        private readonly gamesService: GamesService,
        private readonly tagsService: TagsService,
        private readonly meetsService: MeetsService,
        private readonly groupsService: GroupsService,
        private readonly reviewsService: ReviewsService,
        private readonly wishlistService: WishlistService,
        private readonly gamesOwnedService: GamesOwnedService,
        private readonly meetAccountGamesService: MeetAccountGamesService,
        private readonly collectionActivityService: CollectionActivityService,
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

        // Get play history
        const playHistoryRecords = await this.meetAccountGamesService.getMeetAccountGamesBy({ accountId: userId, gameId })
        const playHistoryData: GameViewDto['playHistory'] = await Promise.all(
            playHistoryRecords.map(async record => {
                const meetData = await this.meetsService.getMeetById(record.meetId)
                const groupData = await this.groupsService.getGroupById(meetData.groupId)
                const meetAttendees = await this.meetAccountGamesService.getMeetAccountGamesBy({ meetId: record.meetId })

                return {
                    group: groupData,
                    meet: meetData,
                    playedBy: await Promise.all(meetAttendees.map(async attendee => this.usersService.getUserById(attendee.accountId))),
                }
            }),
        )

        // Step 2: Construct the GameView
        return {
            gameData,
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
                avgGroupsRating,
                avgGlobalRating,
            },
            similarGames: similarGamesFiltered,
            playHistory: playHistoryData,
        }
    }

    @LogFeature(new Logger('CollectionService'))
    async addGameToUserCollection(userId: number, gameId: number): Promise<SuccessDto> {
        const result = await this.gamesOwnedService.createGamesOwned({
            accountId: userId,
            gameId,
            purchaseDate: null,
            purchasePrice: null,
            purchaseNotes: null,
        })

        if (result.success) {
            await this.collectionActivityService.logCollectionActivity(userId, gameId, 'added', null)
        }

        return { success: result.success }
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

                return { ...review, gameData: game }
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
    async getUserWishlist(userId: number): Promise<Array<GameDto>> {
        const wishlist = await this.wishlistService.getWishlistByAccountId(userId)

        return Promise.all(wishlist.map(async gameId => this.gamesService.getGameById(gameId)))
    }

    @LogFeature(new Logger('CollectionService'))
    async getUserCollectionActivities(userId: number): Promise<Array<CollectionActivityWithGameDataDto>> {
        const activities = await this.collectionActivityService.getUserCollectionActivities(userId)

        return Promise.all(
            activities.map(async activity => {
                const game = await this.gamesService.getGameById(activity.gameId)

                return { ...activity, gameData: game }
            }),
        )
    }
}
