import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'

import { CollectionActivityService } from './collection-activity.service.js'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [CollectionActivityService],
    exports: [CollectionActivityService],
})
export class CollectionActivityModule {}
