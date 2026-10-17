import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'
import { NotificationsModule } from '../notifications/notifications.module.js'

import { UsersController } from './users.controller.js'
import { UsersService } from './users.service.js'

@Module({
    imports: [CacheModule, DatabaseModule, NotificationsModule],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
