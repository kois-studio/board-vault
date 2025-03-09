import { Injectable, Logger } from '@nestjs/common'
import { LogFeature } from '../../../common/decorators/logger.decorator'
import type { GameReviewWithGameDataDto } from '../../../common/types/game-review.type'
import type { GameDto } from '../../../common/types/game.type'
import { GamesOwnedService } from '../../core/games-owned/games-owned.service'
import { GamesService } from '../../core/games/games.service'
import { ReviewsService } from '../../core/reviews/reviews.service'
import { UsersService } from '../../users/users.service'

@Injectable()
export class CollectionService {
    constructor(
        private readonly usersService: UsersService,
        private readonly gamesOwnedService: GamesOwnedService,
        private readonly gamesService: GamesService,
        private readonly reviewsService: ReviewsService,
    ) {}

    @LogFeature(new Logger('CollectionService'))
    async getGamesOwnedByUser(userId: number): Promise<Array<GameDto>> {
        const gamesOwned = await this.gamesOwnedService.getGamesOwnedByAccountId(userId)
        return Promise.all(gamesOwned.map(async game => this.gamesService.getGameById(game.gameId)))
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
