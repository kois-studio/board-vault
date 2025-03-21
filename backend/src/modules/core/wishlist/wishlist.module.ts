import { Module } from '@nestjs/common'

// module dependencies
import { DatabaseModule } from '../../common/database/database.module'

import { WishlistService } from './wishlist.service'

@Module({
    imports: [DatabaseModule],
    providers: [WishlistService],
    exports: [WishlistService],
})
export class WishlistModule {}
