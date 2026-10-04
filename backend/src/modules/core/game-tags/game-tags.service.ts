import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger } from '@nestjs/common'

import { gameTagsSchema, GameTagType } from '../../../common/schemas/db-game-tag.schema'
import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'

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
            return []
        }

        return result.data
    }

    async getGameTags(gameId: number): Promise<Array<GameTagType>> {
        this.LOGGER.log('Getting tags for game')

        // Step 1: Try to get them from cache
        const cachedTags = await this.cacheService.get(`${this.CACHE_KEY}:byGameId:${gameId}`)

        if (cachedTags) {
            this.LOGGER.log('Returning cached game tags')
            return this._validateSchema(cachedTags)
        }

        // Step 2: If no cached, get them from database
        const resultSet = await this.databaseService.games.getGameTags(gameId)
        const tags = this._parseResultSet(resultSet)

        // Step 3: Save them to cache
        await this.cacheService.set(`${this.CACHE_KEY}:byGameId:${gameId}`, tags)

        return tags
    }

    async getGameCountByTagCategoryId(tagCategoryId: number): Promise<number> {
        this.LOGGER.log('Getting game count for tag category')

        const resultSet = await this.databaseService.games.getGameCountByTagCategoryId(tagCategoryId)

        return Number(resultSet.rows[0]?.[0] ?? 0)
    }

    async getGameCountByTagId(tagId: number): Promise<number> {
        this.LOGGER.log('Getting game count for tag')

        const resultSet = await this.databaseService.games.getGameCountByTagId(tagId)

        return Number(resultSet.rows[0]?.[0] ?? 0)
    }

    async addGameTag(gameId: number, tagId: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Adding tag to game')

        await this.databaseService.games.addGameTag(gameId, tagId)

        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byGameId:${gameId}`)

        return { success: true }
    }

    async removeGameTag(gameId: number, tagId: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Removing tag from game')

        await this.databaseService.games.removeGameTag(gameId, tagId)

        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byGameId:${gameId}`)

        return { success: true }
    }
}
