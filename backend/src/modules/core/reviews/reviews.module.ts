import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module'
import { DatabaseModule } from '../../common/database/database.module'

import { ReviewsController } from './reviews.controller'
import { ReviewsService } from './reviews.service'
// module dependencies

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [ReviewsService],
    exports: [ReviewsService],
    controllers: [ReviewsController],
})
export class ReviewsModule {}
