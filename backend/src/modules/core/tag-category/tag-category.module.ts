import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { TagCategoryService } from './tag-category.service.js'

@Module({
    imports: [DatabaseModule],
    providers: [TagCategoryService],
    exports: [TagCategoryService],
})
export class TagCategoryModule {}
