import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { SessionsController } from './sessions.controller.js'
import { SessionsService } from './sessions.service.js'

@Module({
    imports: [DatabaseModule],
    controllers: [SessionsController],
    providers: [SessionsService],
})
export class SessionsModule {}
