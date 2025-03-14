import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { NotificationsController } from './notifications.controller'
import { NotificationsService } from './notifications.service'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [NotificationsService],
    exports: [NotificationsService],
    controllers: [NotificationsController],
})
export class NotificationsModule {}
