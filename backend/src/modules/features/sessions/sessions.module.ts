import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'
import { NotificationsModule } from '../../core/notifications/notifications.module.js'

import { SessionsController } from './sessions.controller.js'
import { SessionsService } from './sessions.service.js'

@Module({
    imports: [DatabaseModule, NotificationsModule],
    controllers: [SessionsController],
    providers: [SessionsService],
})
export class SessionsModule {}
