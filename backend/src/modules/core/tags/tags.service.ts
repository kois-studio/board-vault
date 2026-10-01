import { ResultSet } from '@libsql/client'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { tagsSchema } from '../../../common/schemas/db-tag.schema'
import { CacheService } from '../../common/cache/cache.service'
import { DatabaseService } from '../../common/database/database.service'

import type { TagDto } from '../../../common/types/tag.type'

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
            return []
        }

        return result.data
    }

    async getTags(): Promise<Array<TagDto>> {
        this.LOGGER.log('Getting all tags')

        const resultSet = await this.databaseService.games.getTags()
        const tags = this._parseResultSet(resultSet)

        return tags
    }

    async getTagById(tagId: number): Promise<TagDto> {
        this.LOGGER.log('Getting tag by id')

        const resultSet = await this.databaseService.games.getTagById(tagId)
        const tags = this._parseResultSet(resultSet)

        if (tags.length === 0) {
            throw new NotFoundException(`Tag with id ${tagId} not found`)
        }

        return tags[0]
    }

    async getTagsByCategoryId(categoryId: number): Promise<Array<TagDto>> {
        this.LOGGER.log('Getting tags for category')

        const resultSet = await this.databaseService.games.getTagsByCategoryId(categoryId)
        const tags = this._parseResultSet(resultSet)

        return tags
    }

    async createTag(name: string, categoryId: number): Promise<TagDto> {
        this.LOGGER.log('Creating tag in category')

        const resultSet = await this.databaseService.games.createTag(name, categoryId)
        const tagId = Number(resultSet.lastInsertRowid)

        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byCategoryId:${categoryId}`)

        return this.getTagById(tagId)
    }

    async updateTag(id: number, name: string, categoryId: number): Promise<TagDto> {
        this.LOGGER.log('Updating tag in category')

        await this.databaseService.games.updateTag(id, name, categoryId)

        // Clear cache
        await this.cacheService.deleteOne(`${this.CACHE_KEY}:byCategoryId:${categoryId}`)

        return this.getTagById(id)
    }

    async deleteTag(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Deleting tag')

        await this.databaseService.games.deleteTag(id)

        return { success: true }
    }
}
