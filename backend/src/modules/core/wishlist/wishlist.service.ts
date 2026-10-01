import { ResultSet } from '@libsql/client'
import { Injectable, Logger } from '@nestjs/common'

import { wishlistedGamesSchema } from '../../../common/schemas/db-wishlisted-game.schema'
import { DatabaseService } from '../../common/database/database.service'

import type { GameDto } from '../../../common/types/game.type'
import type { WishlistedGameDto } from '../../../common/types/wishlisted-game.type'

@Injectable()
export class WishlistService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<WishlistedGameDto> {
        const wishlistedGames = resultSet.rows.map(row => ({
            accountId: Number(row[0]),
            gameId: Number(row[1]),
            dateAdded: String(row[2]),
            priority: Number(row[3]),
            notes: String(row[4]),
        }))

        return this._validateSchema(wishlistedGames)
    }

    private _validateSchema(wishlistedGames: Array<WishlistedGameDto>): Array<WishlistedGameDto> {
        const result = wishlistedGamesSchema.safeParse(wishlistedGames)

        if (!result.success) {
            this.LOGGER.error('Failed to parse Tags from database')
            return []
        }

        return result.data
    }

    // #region methods

    async getWishlistByAccountId(accountId: number): Promise<Array<GameDto['id']>> {
        const resultSet = await this.databaseService.collection.getWishlistByAccountId(accountId)

        return this._parseResultSet(resultSet).map(game => game.gameId)
    }

    async isGameWishlisted(accountId: number, gameId: number): Promise<boolean> {
        const resultSet = await this.databaseService.collection.getWishlistById(accountId, gameId)

        return resultSet.rows.length > 0
    }

    async toggleWishlist(accountId: number, gameId: number): Promise<boolean> {
        const isWishlisted = await this.isGameWishlisted(accountId, gameId)

        if (isWishlisted) {
            await this.databaseService.collection.removeGameFromWishlist(accountId, gameId)
        } else {
            await this.databaseService.collection.addGameToWishlist(accountId, gameId)
        }

        return this.isGameWishlisted(accountId, gameId)
    }
}
