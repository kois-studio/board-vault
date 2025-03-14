import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { MeetAttendeesController } from './meet-attendees.controller'
import { MeetAttendeesService } from './meet-attendees.service'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [MeetAttendeesService],
    exports: [MeetAttendeesService],
    controllers: [MeetAttendeesController],
})
export class MeetAttendeesModule {}
