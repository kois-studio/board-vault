import { Module } from '@nestjs/common'
import { MeetAttendeesService } from './meet-attendees.service'
import { MeetAttendeesController } from './meet-attendees.controller'
// module dependencies
import { DatabaseModule } from '../../common/database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [MeetAttendeesService],
    exports: [MeetAttendeesService],
    controllers: [MeetAttendeesController],
})
export class MeetAttendeesModule {}
