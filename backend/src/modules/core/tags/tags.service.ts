import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger } from '@nestjs/common'

import { tagsSchema } from '../../../common/schemas/db-tag.schema'
import { TagDto } from '../../../common/types/tag.type'
import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'

@Injectable()
export class TagsService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly CACHE_KEY = 'tags'

    constructor(
        private readonly databaseService: DatabaseService,
        private readonly cacheService: CacheService,
    ) {}

    private _parseResultSet(resultSet: ResultSet): Array<TagDto> {
        const tags = resultSet.rows.map(row => ({
            tag: String(row[0]),
            category: String(row[1]),
        }))

        return this._validateSchema(tags)
    }

    private _validateSchema(tags: Array<TagDto>): Array<TagDto> {
        const result = tagsSchema.safeParse(tags)

        if (!result.success) {
            this.LOGGER.error('Failed to parse Tags from database')
            this.LOGGER.error(result.error)
            return []
        }

        return result.data
    }

    async getGameTags(gameId: number): Promise<Array<TagDto>> {
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
