import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'

import { TagsService } from './tags.service.js'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [TagsService],
    exports: [TagsService],
})
export class TagsModule {}
