import { Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { TagCategoryService } from '../../../modules/core/tag-category/tag-category.service'
import type { TagCategoryWithTagsDto } from 'src/common/types/tag-category.type'
import { TagsService } from 'src/modules/core/tags/tags.service'
import { GamesService } from 'src/modules/core/games/games.service'
import { GameTagsService } from 'src/modules/core/game-tags/game-tags.service'
import { TagDto } from 'src/common/types/tag.type'

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

    // #region Tags

    @LogFeature(new Logger('AdminService'))
    async getAdminTags(): Promise<TagDto[]> {
        const tags = await this.tagService.getTags()

        return tags
    }

    // #endregion
}
