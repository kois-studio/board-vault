import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { ActivityNotifier } from './activity-notifier.service.js'
import { NotificationsController } from './notifications.controller.js'
import { NotificationsService } from './notifications.service.js'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [NotificationsService, ActivityNotifier],
    exports: [NotificationsService, ActivityNotifier],
    controllers: [NotificationsController],
})
export class NotificationsModule {}
