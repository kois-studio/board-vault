import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { TagCategoryService } from './tag-category.service'

@Module({
    imports: [DatabaseModule],
    providers: [TagCategoryService],
    exports: [TagCategoryService],
})
export class TagCategoryModule {}
