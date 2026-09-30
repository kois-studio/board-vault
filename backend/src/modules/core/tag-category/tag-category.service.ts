import { ResultSet } from '@libsql/client/.'
import { Injectable, Logger } from '@nestjs/common'

import { tagCategoriesSchema } from '../../../common/schemas/db-tag-category.schema'
import { TagCategoryDto } from '../../../common/types/tag-category.type'
import { DatabaseService } from '../../common/database/database.service'

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

    async getTagCategoryById(id: number): Promise<TagCategoryDto> {
        const resultSet = await this.databaseService.games.getTagCategoryById(id)
        const tags = this._parseResultSet(resultSet)

        return tags[0]
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
