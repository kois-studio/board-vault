import { Module } from '@nestjs/common'
import { CollectionService } from './collection.service'
import { CollectionController } from './collection.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'
import { UsersModule } from '../../users/users.module'
import { GamesOwnedModule } from '../../core/games-owned/games-owned.module'
import { GamesModule } from '../../core/games/games.module'
import { ReviewsModule } from '../../core/reviews/reviews.module'

@Module({
    imports: [
        DatabaseModule, // needed for VerifiedUserGuard
        UsersModule,
        GamesOwnedModule,
        GamesModule,
        ReviewsModule,
    ],
    providers: [CollectionService],
    exports: [CollectionService],
    controllers: [CollectionController],
})
export class CollectionModule {}
