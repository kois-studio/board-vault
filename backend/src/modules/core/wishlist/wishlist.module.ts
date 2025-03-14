import { Module } from '@nestjs/common'

// module dependencies
import { DatabaseModule } from '../../common/database/database.module'

import { WishlistController } from './wishlist.controller'
import { WishlistService } from './wishlist.service'

@Module({
    imports: [DatabaseModule],
    providers: [WishlistService],
    exports: [WishlistService],
    controllers: [WishlistController],
})
export class WishlistModule {}
