import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { ResultSet } from '@libsql/client/.'
import { CreateGameReviewBody, GameReviewDto } from '../../common/types/game-review.type'
import { gameReviewsSchema } from '../../common/schemas/db-game-review.schema'

@Injectable()
export class ReviewsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<GameReviewDto> {
        const reviews = resultSet.rows.map(row => ({
            accountId: Number(row[0]),
            gameId: Number(row[1]),
            review: Number(row[2]),
            reviewDate: String(row[3]),
        }))
        const result = gameReviewsSchema.safeParse(reviews)

        if (!result.success) {
            this.LOGGER.error('Failed to parse reviews from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

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

    async createGameReview(gameReviewDto: CreateGameReviewBody) {
        this.LOGGER.log(`Creating gameReview ${gameReviewDto.accountId} - ${gameReviewDto.gameId}`)
        try {
            await this.databaseService.createGameReview(gameReviewDto)

            return { success: true }
        } catch (error) {
            this.LOGGER.error('Review creation failed', error)
            throw new BadRequestException('Review creation failed')
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
}
