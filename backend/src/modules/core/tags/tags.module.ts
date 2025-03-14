import { Module } from '@nestjs/common'

// module dependencies
import { CacheModule } from '../../common/cache/cache.module'
import { DatabaseModule } from '../../common/database/database.module'

import { TagsService } from './tags.service'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [TagsService],
    exports: [TagsService],
})
export class TagsModule {}
