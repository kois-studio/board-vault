import { Module } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { MeetAttendeesService } from './meet-attendees.service'
import { MeetAttendeesController } from './meet-attendees.controller'

@Module({
    providers: [MeetAttendeesService, DatabaseService],
    exports: [MeetAttendeesService],
    controllers: [MeetAttendeesController],
})
export class MeetAttendeesModule {}
