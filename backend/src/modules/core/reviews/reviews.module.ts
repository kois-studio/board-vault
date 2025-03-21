import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module'
import { DatabaseModule } from '../../common/database/database.module'

import { ReviewsService } from './reviews.service'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [ReviewsService],
    exports: [ReviewsService],
})
export class ReviewsModule {}
