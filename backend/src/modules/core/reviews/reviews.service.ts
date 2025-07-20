import { ResultSet } from '@libsql/client/.'
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'

import { gameReviewsSchema } from '../../../common/schemas/db-game-review.schema'
import { GameReviewDto } from '../../../common/types/game-review.type'
import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'

@Injectable()
export class ReviewsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly CACHE_KEY = 'reviews'

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<GameReviewDto> {
        const reviews = resultSet.rows.map(row => ({
            accountId: Number(row[0]),
            gameId: Number(row[1]),
            review: Number(row[2]),
            reviewDate: String(row[3]),
        }))

        return this._validateSchema(reviews)
    }

    private _validateSchema(reviews: Array<GameReviewDto>): Array<GameReviewDto> {
        const result = gameReviewsSchema.safeParse(reviews)

        if (!result.success) {
            this.LOGGER.error('Failed to parse reviews from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    // #region methods

    async getGameReviews(): Promise<Array<GameReviewDto>> {
        this.LOGGER.log('Getting all reviews')
        const resultSet = await this.databaseService.getGameReviews()

        return this._parseResultSet(resultSet)
    }

    async getGameReviewsById(accountId: number, gameId: number): Promise<GameReviewDto> {
        this.LOGGER.log(`Getting review with accountId ${accountId} and gameId ${gameId}`)
        const resultSet = await this.databaseService.getGameReviewById(accountId, gameId)
        const reviews = this._parseResultSet(resultSet)

        if (reviews.length === 0) {
            throw new NotFoundException(`Review with accountId ${accountId} and gameId ${gameId} not found`)
        }
        return reviews[0]
    }

    async getSafeGameReviewsById(accountId: number, gameId: number): Promise<null | GameReviewDto> {
        try {
            return await this.getGameReviewsById(accountId, gameId)
        } catch (error) {
            this.LOGGER.error(`Failed to get review with accountId ${accountId} and gameId ${gameId}`, error)
            return null
        }
    }

    async getGameReviewsByAccountId(accountId: number): Promise<Array<GameReviewDto>> {
        this.LOGGER.log(`Getting reviews for account ${accountId}`)
        const resultSet = await this.databaseService.getGameReviewsByAccountId(accountId)

        return this._parseResultSet(resultSet)
    }

    async saveGameReview(accountId: number, gameId: number, review: number) {
        // NOTE: the review may alread exist
        this.LOGGER.log(`Saving gameReview ${accountId} - ${gameId}`)
        try {
            // check if the review already exists
            const existingReview = await this.getSafeGameReviewsById(accountId, gameId)

            // its the same, so skip 1 query
            if (existingReview && existingReview?.review === review) {
                this.LOGGER.log(`Review ${accountId} - ${gameId} already exists, skipping`)
                return { success: true }
            }

            if (existingReview) {
                // update the review
                await this.databaseService.deleteGameReviewById(accountId, gameId)
            }

            // create the review
            await this.databaseService.createGameReview(accountId, gameId, review)

            // invalidate the cache
            await this.cacheService.deleteOne(`${this.CACHE_KEY}:userReviewsWithGameData:${accountId}`)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Review save failed', error)
            throw new BadRequestException('Review save failed')
        }
    }

    async deleteGameReviewById(accountId: number, gameId: number): Promise<{ success: boolean }> {
        this.LOGGER.log(`Deleting review with accountId ${accountId} and gameId ${gameId}`)
        const resultSet = await this.databaseService.deleteGameReviewById(accountId, gameId)

        if (resultSet.rowsAffected === 0) {
            throw new NotFoundException(`Game Review with accountId ${accountId} and gameId ${gameId} not found`)
        }

        return { success: true }
    }

    async getUserReviews(userId: number): Promise<Array<GameReviewDto>> {
        this.LOGGER.log(`Getting reviews for user ${userId}`)

        // Step 1: Try to get them from cache
        const cachedReviews = await this.cacheService.get(`${this.CACHE_KEY}:userReviewsWithGameData:${userId}`)

        if (cachedReviews) {
            this.LOGGER.log(`Returning cached reviews for user ${userId}`)
            return cachedReviews
        }

        // Step 2: If no cached, get them from database
        const resultSet = await this.databaseService.getUserReviews(userId)
        const reviews = this._parseResultSet(resultSet)

        // Step 3: Save them to cache
        await this.cacheService.set(`${this.CACHE_KEY}:userReviewsWithGameData:${userId}`, reviews)

        return reviews
    }

    // #region avg methods

    async getAvgGlobalRating(gameId: number): Promise<null | { review: number; count: number }> {
        this.LOGGER.log(`Getting avg global rating for game ${gameId}`)

        // Step 1: Try to get them from cache
        const cachedRating = await this.cacheService.get(`${this.CACHE_KEY}:avgGlobalRating:${gameId}`)

        if (cachedRating) {
            this.LOGGER.log(`Returning cached avg global rating for game ${gameId}`)
            return { review: Number(cachedRating.review), count: Number(cachedRating.count) }
        }

        // Step 2: If no cached, get them from database
        const resultSet = await this.databaseService.getAvgGlobalRating(gameId)
        const avgGlobalRating = {
            review: Number(resultSet.rows[0].avgGlobalRating),
            count: Number(resultSet.rows[0].count),
        }

        // Step 3: Save them to cache
        await this.cacheService.set(`${this.CACHE_KEY}:avgGlobalRating:${gameId}`, avgGlobalRating, 'long')

        return avgGlobalRating
    }

    async getAvgGroupsRating(accountId: number, gameId: number): Promise<null | { review: number; count: number }> {
        this.LOGGER.log(`Getting avg groups rating for game ${gameId}`)

        // Step 1: Try to get them from cache
        const cachedRating = await this.cacheService.get(`${this.CACHE_KEY}:avgGroupsRating:${accountId}:${gameId}`)

        if (cachedRating) {
            this.LOGGER.log(`Returning cached avg groups rating for game ${gameId}`)
            return { review: Number(cachedRating.review), count: Number(cachedRating.count) }
        }

        // Step 2: If no cached, get them from database
        const resultSet = await this.databaseService.getAvgGroupsRating(accountId, gameId)
        const avgGroupsRating = {
            review: Number(resultSet.rows[0].avgGroupsRating),
            count: Number(resultSet.rows[0].count),
        }

        // Step 3: Save them to cache
        await this.cacheService.set(`${this.CACHE_KEY}:avgGroupsRating:${accountId}:${gameId}`, avgGroupsRating, 'long')

        return avgGroupsRating
    }
}
