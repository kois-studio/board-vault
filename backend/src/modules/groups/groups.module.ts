import { Module } from '@nestjs/common'
import { GroupsService } from './groups.service'
import { GroupsController } from './groups.controller'
// module dependencies
import { DatabaseModule } from '../common/database/database.module'

@Module({
    imports: [DatabaseModule],
    providers: [GroupsService],
    exports: [GroupsService],
    controllers: [GroupsController],
})
export class GroupsModule {}
