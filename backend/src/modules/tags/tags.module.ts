import { Module } from '@nestjs/common'
import { TagsService } from './tags.service'
// module dependencies
import { CacheModule } from '../cache/cache.module'
import { DatabaseModule } from '../database/database.module'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [TagsService],
    exports: [TagsService],
})
export class TagsModule {}
