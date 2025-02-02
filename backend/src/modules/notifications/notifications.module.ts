import { Module } from '@nestjs/common'
import { NotificationsService } from './notifications.service'
import { NotificationsController } from './notifications.controller'
// module dependencies
import { DatabaseModule } from '../database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [NotificationsService],
    exports: [NotificationsService],
    controllers: [NotificationsController],
})
export class NotificationsModule {}
