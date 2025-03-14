import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module'

import { GroupsController } from './groups.controller'
import { GroupsService } from './groups.service'
// module dependencies

@Module({
    imports: [DatabaseModule],
    providers: [GroupsService],
    exports: [GroupsService],
    controllers: [GroupsController],
})
export class GroupsModule {}
