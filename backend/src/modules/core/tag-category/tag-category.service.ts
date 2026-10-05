import { ResultSet } from '@libsql/client'
import { Injectable, Logger, NotFoundException } from '@nestjs/common'

import { tagCategoriesSchema } from '../../../common/schemas/db-tag-category.schema.js'
import { TagCategoryDto, TagCategoryWithTagsDto } from '../../../common/types/tag-category.type.js'
import { DatabaseService } from '../../common/database/database.service.js'

@Injectable()
export class TagCategoryService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(private readonly databaseService: DatabaseService) {}

    private _parseResultSet(resultSet: ResultSet): Array<TagCategoryDto> {
        const tags = resultSet.rows.map(row => ({
            id: Number(row[0]),
            name: String(row[1]),
        }))

        return this._validateSchema(tags)
    }

    private _validateSchema(tags: Array<TagCategoryDto>): Array<TagCategoryDto> {
        const result = tagCategoriesSchema.safeParse(tags)

        if (!result.success) {
            this.LOGGER.error('Failed to parse TagCategories from database')
            return []
        }

        return result.data
    }

    async getTagCategories(): Promise<Array<TagCategoryDto>> {
        this.LOGGER.log('Getting tag categories')

        const resultSet = await this.databaseService.games.getTagCategories()
        const tags = this._parseResultSet(resultSet)

        return tags
    }

    /** All categories with their tag ids and distinct game counts, in one query. */
    async getTagCategoriesWithTags(): Promise<Array<TagCategoryWithTagsDto>> {
        this.LOGGER.log('Getting tag categories with tags')

        const resultSet = await this.databaseService.games.getTagCategoriesWithTags()

        return this._parseWithTags(resultSet)
    }

    async getTagCategoryWithTags(id: number): Promise<TagCategoryWithTagsDto> {
        const resultSet = await this.databaseService.games.getTagCategoriesWithTags(id)
        const [category] = this._parseWithTags(resultSet)

        if (!category) {
            throw new NotFoundException(`Tag category with id ${id} not found`)
        }

        return category
    }

    private _parseWithTags(resultSet: ResultSet): Array<TagCategoryWithTagsDto> {
        return resultSet.rows.map(row => ({
            id: Number(row[0]),
            name: String(row[1]),
            tags: (JSON.parse(String(row[2])) as Array<unknown>).map(Number),
            gameCount: Number(row[3]),
        }))
    }

    async getTagCategoryById(id: number): Promise<TagCategoryDto> {
        const resultSet = await this.databaseService.games.getTagCategoryById(id)
        const [category] = this._parseResultSet(resultSet)

        if (!category) {
            throw new NotFoundException(`Tag category with id ${id} not found`)
        }

        return category
    }

    async createTagCategory(name: string): Promise<TagCategoryDto> {
        this.LOGGER.log('Creating tag category')

        const resultSet = await this.databaseService.games.createTagCategory(name)
        const categoryId = Number(resultSet.lastInsertRowid)

        return this.getTagCategoryById(categoryId)
    }

    async updateTagCategory(id: number, name: string): Promise<TagCategoryDto> {
        this.LOGGER.log('Updating tag category')

        await this.databaseService.games.updateTagCategory(id, name)

        return this.getTagCategoryById(id)
    }

    async deleteTagCategory(id: number): Promise<{ success: boolean }> {
        this.LOGGER.log('Deleting tag category')

        await this.databaseService.games.deleteTagCategory(id)

        return { success: true }
    }
}
