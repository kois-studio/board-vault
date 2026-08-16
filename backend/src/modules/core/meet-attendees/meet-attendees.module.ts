import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { MeetAttendeesController } from './meet-attendees.controller'
import { MeetAttendeesService } from './meet-attendees.service'

@Module({
    imports: [DatabaseModule],
    providers: [MeetAttendeesService],
    controllers: [MeetAttendeesController],
    exports: [MeetAttendeesService],
})
export class MeetAttendeesModule {}
