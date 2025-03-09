import { Module } from '@nestjs/common'
import { CollectionService } from './collection.service'
import { CollectionController } from './collection.controller'
// module dependencies
import { UsersModule } from 'src/modules/users/users.module'
import { GamesOwnedModule } from 'src/modules/core/games-owned/games-owned.module'
import { GamesModule } from 'src/modules/core/games/games.module'
import { ReviewsModule } from 'src/modules/core/reviews/reviews.module'

@Module({
    imports: [
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
