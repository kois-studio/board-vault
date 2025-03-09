import { Injectable, Logger } from '@nestjs/common'
import { LogFeature } from 'src/common/decorators/logger.decorator'
import type { GameDto } from 'src/common/types/game.type'
import { GamesOwnedService } from 'src/modules/core/games-owned/games-owned.service'
import { GamesService } from 'src/modules/core/games/games.service'
import { ReviewsService } from 'src/modules/core/reviews/reviews.service'
import { UsersService } from 'src/modules/users/users.service'


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
}
