import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module'
import { DatabaseModule } from '../../common/database/database.module'

import { CollectionActivityService } from './collection-activity.service'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [CollectionActivityService],
    exports: [CollectionActivityService],
})
export class CollectionActivityModule {}
