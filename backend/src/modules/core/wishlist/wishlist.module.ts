import { Module } from '@nestjs/common'

// module dependencies
import { DatabaseModule } from '../../common/database/database.module.js'

import { WishlistService } from './wishlist.service.js'

@Module({
    imports: [DatabaseModule],
    providers: [WishlistService],
    exports: [WishlistService],
})
export class WishlistModule {}
