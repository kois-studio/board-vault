import { Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { TagCategoryService } from '../../../modules/core/tag-category/tag-category.service'
import type { TagCategoryWithTagsDto } from '../../../common/types/tag-category.type'
import { TagsService } from '../../../modules/core/tags/tags.service'
import { GamesService } from '../../../modules/core/games/games.service'
import { GameTagsService } from '../../../modules/core/game-tags/game-tags.service'
import { TagDto } from '../../../common/types/tag.type'

@Injectable()
export class AdminService {
    constructor(
        private readonly tagService: TagsService,
        private readonly gameService: GamesService,
        private readonly gameTagsService: GameTagsService,
        private readonly tagCategoryService: TagCategoryService,
    ) {}

    // #region Tag Categories

    @LogFeature(new Logger('AdminService'))
    async getAdminTagCategories(): Promise<TagCategoryWithTagsDto[]> {
        const categories = await this.tagCategoryService.getTagCategories()

        return Promise.all(
            categories.map(async category => {
                const tags = await this.tagService.getTagsByCategoryId(category.id)
                const gameCount = await this.gameTagsService.getGameCountByTagCategoryId(category.id)

                return {
                    ...category,
                    tags,
                    gameCount,
                }
            }),
        )
    }

    // #endregion

    async createTagCategory(name: string): Promise<TagCategoryWithTagsDto> {
        const category = await this.tagCategoryService.createTagCategory(name)
        const tags = await this.tagService.getTagsByCategoryId(category.id)
        const gameCount = await this.gameTagsService.getGameCountByTagCategoryId(category.id)

        return {
            ...category,
            tags,
            gameCount,
        }
    }

    async updateTagCategory(id: number, name: string): Promise<TagCategoryWithTagsDto> {
        const category = await this.tagCategoryService.updateTagCategory(id, name)
        const tags = await this.tagService.getTagsByCategoryId(category.id)
        const gameCount = await this.gameTagsService.getGameCountByTagCategoryId(category.id)

        return {
            ...category,
            tags,
            gameCount,
        }
    }

    async deleteTagCategory(id: number): Promise<{ success: boolean }> {
        return this.tagCategoryService.deleteTagCategory(id)
    }

    // #region Tags

    @LogFeature(new Logger('AdminService'))
    async getAdminTags(): Promise<TagDto[]> {
        const tags = await this.tagService.getTags()

        return Promise.all(
            tags.map(async tag => {
                const gameCount = await this.gameTagsService.getGameCountByTagId(tag.id)

                return {
                    ...tag,
                    gameCount,
                }
            }),
        )
    }

    // #endregion

    async createTag(name: string, categoryId: number): Promise<TagDto> {
        const tag = await this.tagService.createTag(name, categoryId)
        const gameCount = await this.gameTagsService.getGameCountByTagId(tag.id)

        return {
            ...tag,
            gameCount,
        }
    }

    async updateTag(id: number, name: string, categoryId: number): Promise<TagDto> {
        const tag = await this.tagService.updateTag(id, name, categoryId)
        const gameCount = await this.gameTagsService.getGameCountByTagId(tag.id)

        return {
            ...tag,
            gameCount,
        }
    }

    async deleteTag(id: number): Promise<{ success: boolean }> {
        return this.tagService.deleteTag(id)
    }
}
