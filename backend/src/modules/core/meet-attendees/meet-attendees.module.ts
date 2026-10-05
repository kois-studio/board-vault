import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { MeetAttendeesController } from './meet-attendees.controller.js'
import { MeetAttendeesService } from './meet-attendees.service.js'

@Module({
    imports: [DatabaseModule],
    providers: [MeetAttendeesService],
    controllers: [MeetAttendeesController],
    exports: [MeetAttendeesService],
})
export class MeetAttendeesModule {}
