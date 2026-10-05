import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'

import { ReviewsService } from './reviews.service.js'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [ReviewsService],
    exports: [ReviewsService],
})
export class ReviewsModule {}
