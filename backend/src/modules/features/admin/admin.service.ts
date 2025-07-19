import { Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { TagCategoryService } from '../../../modules/core/tag-category/tag-category.service'
import type { TagCategoryWithTagsDto } from '../../../common/types/tag-category.type'
import { TagsService } from '../../../modules/core/tags/tags.service'
import { GamesService } from '../../../modules/core/games/games.service'
import { GameTagsService } from '../../../modules/core/game-tags/game-tags.service'
import { GameTranslationService } from '../../../modules/core/game-translation/game-translation.service'
import { TagDto, GameTagWithCategoryDto } from '../../../common/types/tag.type'
import type { GameDto } from '../../../common/types/game.type'
import { UpdateGameTranslationsBody, UpdateGameTagsBody } from '../../../common/types/admin.type'
import { GameWithTagsAndTranslationsDto } from '../../../common/types/game.type'

@Injectable()
export class AdminService {
    constructor(
        private readonly tagService: TagsService,
        private readonly gameService: GamesService,
        private readonly gameTagsService: GameTagsService,
        private readonly tagCategoryService: TagCategoryService,
        private readonly gameTranslationService: GameTranslationService,
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

    // #endregion

    // #region Games

    @LogFeature(new Logger('AdminService'))
    async getAdminGames(): Promise<Array<GameWithTagsAndTranslationsDto>> {
        const games = await this.gameService.getGames()

        return Promise.all(
            games.map(async (game: GameDto) => {
                const translations = await this.gameTranslationService.getGameTranslations(game.id)
                const gameTags = await this.gameTagsService.getGameTags(game.id)
                
                // Get tag details for each game tag
                const tags: Array<GameTagWithCategoryDto> = await Promise.all(
                    gameTags.map(async gameTag => {
                        const tag = await this.tagService.getTagById(gameTag.tagId)
                        const category = await this.tagCategoryService.getTagCategoryById(tag.categoryId)
                        return {
                            id: tag.id,
                            name: tag.name,
                            categoryName: category.name,
                        }
                    })
                )

                return {
                    ...game,
                    translations,
                    tags,
                }
            }),
        )
    }

    async updateGameTranslations(gameId: number, translations: UpdateGameTranslationsBody): Promise<{ success: boolean }> {
        // Update each translation
        for (const [languageCode, title] of Object.entries(translations)) {
            if (title?.trim()) {
                await this.gameTranslationService.createGameTranslation(gameId, languageCode, title)
            }
        }

        return { success: true }
    }

    async updateGameTags(gameId: number, payload: UpdateGameTagsBody): Promise<{ success: boolean }> {
        // Get current tags
        const currentTags = await this.gameTagsService.getGameTags(gameId)
        const currentTagIds = currentTags.map(gt => gt.tagId)

        // Find tags to add and remove
        const tagsToAdd = payload.tagIds.filter(id => !currentTagIds.includes(id))
        const tagsToRemove = currentTagIds.filter(id => !payload.tagIds.includes(id))

        // Remove tags
        for (const tagId of tagsToRemove) {
            await this.gameTagsService.removeGameTag(gameId, tagId)
        }

        // Add tags
        for (const tagId of tagsToAdd) {
            await this.gameTagsService.addGameTag(gameId, tagId)
        }

        return { success: true }
    }
}
