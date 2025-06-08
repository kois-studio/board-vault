import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { tagsSchema } from '../../../common/schemas/db-tag.schema'
import type { TagDto } from '../../../common/types/tag.type'
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
            id: Number(row[0]),
            name: String(row[1]),
            categoryId: Number(row[2]),
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

    async getTags(): Promise<Array<TagDto>> {
        this.LOGGER.log(`Getting all tags`)

        const resultSet = await this.databaseService.getTags()
        const tags = this._parseResultSet(resultSet)

        return tags
    }

    async getTagById(tagId: number): Promise<TagDto> {
        this.LOGGER.log(`Getting tag by id ${tagId}`)

        const resultSet = await this.databaseService.getTagById(tagId)
        const tags = this._parseResultSet(resultSet)

        if (tags.length === 0) {
            throw new NotFoundException(`Tag with id ${tagId} not found`)
        }

        return tags[0]
    }

    async getTagsByCategoryId(categoryId: number): Promise<Array<TagDto>> {
        this.LOGGER.log(`Getting tags for category ${categoryId}`)

        const resultSet = await this.databaseService.getTagsByCategoryId(categoryId)
        const tags = this._parseResultSet(resultSet)

        if (tags.length === 0) {
            throw new NotFoundException(`No tags found for category ${categoryId}`)
        }

        return tags
    }
}
