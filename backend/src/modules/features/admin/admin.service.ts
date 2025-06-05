import { Injectable, Logger } from '@nestjs/common'

import { LogFeature } from '../../../common/decorators/logger.decorator'
import { TagCategoryService } from '../../../modules/core/tag-category/tag-category.service'

@Injectable()
export class AdminService {
    constructor(private readonly tagCategoryService: TagCategoryService) {}

    @LogFeature(new Logger('AdminService'))
    async getAdminTagCategories() {
        return this.tagCategoryService.getTagCategories()
    }
}
