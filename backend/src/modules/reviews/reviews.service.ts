import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ResultSet } from '@libsql/client/.'
import { CreateGameReviewBody, GameReviewDto } from '../../common/types/game-review.type'
import { gameReviewsSchema } from '../../common/schemas/db-game-review.schema'
import { CacheService } from '../cache/cache.service'

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
            return null
        }
    }

    async saveGameReview(gameReviewDto: CreateGameReviewBody) {
        // NOTE: the review may alread exist
        this.LOGGER.log(`Saving gameReview ${gameReviewDto.accountId} - ${gameReviewDto.gameId}`)
        try {
            // check if the review already exists
            const existingReview = await this.getSafeGameReviewsById(gameReviewDto.accountId, gameReviewDto.gameId)
            if (existingReview) {
                // update the review
                await this.databaseService.deleteGameReviewById(gameReviewDto.accountId, gameReviewDto.gameId)
            }

            // its the same, so skip 1 query
            if (existingReview?.review === gameReviewDto.review) {
                return { success: true }
            }

            // create the review
            await this.databaseService.createGameReview(gameReviewDto)

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

    // #region special methods

    async getAvgGlobalRating(gameId: number): Promise<null | { review: number, count: number }> {
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
        const cacheDuration = 60 * 60 * 24 * 30 // 30 days
        await this.cacheService.set(`${this.CACHE_KEY}:avgGlobalRating:${gameId}`, avgGlobalRating, cacheDuration)

        return avgGlobalRating
    }

    async getAvgGroupsRating(accountId: number, gameId: number): Promise<null | { review: number, count: number }> {
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
        const cacheDuration = 60 * 60 * 24 * 30 // 30 days
        await this.cacheService.set(`${this.CACHE_KEY}:avgGroupsRating:${accountId}:${gameId}`, avgGroupsRating, cacheDuration)

        return avgGroupsRating
    }
}
