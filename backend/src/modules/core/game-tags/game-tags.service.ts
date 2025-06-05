import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger } from '@nestjs/common'

import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'
import { gameTagsSchema, GameTagType } from '../../../common/schemas/db-game-tag.schema'

@Injectable()
export class GameTagsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly CACHE_KEY = 'game-tags'

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<GameTagType> {
        const tags = resultSet.rows.map(row => ({
            gameId: Number(row[0]),
            tagId: Number(row[1]),
        }))

        return this._validateSchema(tags)
    }

    private _validateSchema(tags: Array<GameTagType>): Array<GameTagType> {
        const result = gameTagsSchema.safeParse(tags)

        if (!result.success) {
            this.LOGGER.error('Failed to parse GameTags from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getGameTags(gameId: number): Promise<Array<GameTagType>> {
        this.LOGGER.log(`Getting tags for game ${gameId}`)

        // Step 1: Try to get them from cache
        const cachedTags = await this.cacheService.get(`${this.CACHE_KEY}:byGameId:${gameId}`)

        if (cachedTags) {
            this.LOGGER.log(`Returning cached tags for game ${gameId}`)
            return this._validateSchema(cachedTags)
        }

        // Step 2: If no cached, get them from database
        const resultSet = await this.databaseService.getGameTags(gameId)
        const tags = this._parseResultSet(resultSet)

        // Step 3: Save them to cache
        await this.cacheService.set(`${this.CACHE_KEY}:byGameId:${gameId}`, tags)

        return tags
    }
}
