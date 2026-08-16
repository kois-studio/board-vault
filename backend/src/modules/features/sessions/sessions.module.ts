import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { SessionsController } from './sessions.controller'
import { SessionsService } from './sessions.service'

@Module({
    imports: [DatabaseModule],
    controllers: [SessionsController],
    providers: [SessionsService],
})
export class SessionsModule {}
