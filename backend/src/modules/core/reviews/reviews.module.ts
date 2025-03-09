import { Module } from '@nestjs/common'
import { ReviewsService } from './reviews.service'
import { ReviewsController } from './reviews.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { CacheModule } from '../../common/cache/cache.module'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [ReviewsService],
    exports: [ReviewsService],
    controllers: [ReviewsController],
})
export class ReviewsModule {}
