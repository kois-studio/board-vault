import { Module } from '@nestjs/common'
import { ReviewsService } from './reviews.service'
import { ReviewsController } from './reviews.controller'
import { DatabaseService } from '../database/database.service'

@Module({
    providers: [ReviewsService, DatabaseService],
    exports: [ReviewsService],
    controllers: [ReviewsController],
})
export class GameReviewsModule {}
