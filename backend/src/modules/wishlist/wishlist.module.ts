import { Module } from '@nestjs/common'
import { WishlistService } from './wishlist.service'
// module dependencies
import { DatabaseModule } from '../database/database.module'
import { WishlistController } from './wishlist.controller'

@Module({
    imports: [DatabaseModule],
    providers: [WishlistService],
    exports: [WishlistService],
    controllers: [WishlistController],
})
export class WishlistModule {}
