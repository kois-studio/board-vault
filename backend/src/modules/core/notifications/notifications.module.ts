import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { NotificationsController } from './notifications.controller.js'
import { NotificationsService } from './notifications.service.js'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [NotificationsService],
    exports: [NotificationsService],
    controllers: [NotificationsController],
})
export class NotificationsModule {}
