import { Module } from '@nestjs/common'
import { ReviewsService } from './reviews.service'
import { ReviewsController } from './reviews.controller'
// module dependencies
import { DatabaseModule } from '../database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [ReviewsService],
    exports: [ReviewsService],
    controllers: [ReviewsController],
})
export class GameReviewsModule {}
