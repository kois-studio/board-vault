import { Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
import { DatabaseService } from '../database/database.service'

@Module({
    providers: [NotificationsService, DatabaseService],
    exports: [NotificationsService],
    controllers: [NotificationsController],
})
export class NotificationsModule {}
