import { Module } from '@nestjs/common'
import { GroupsService } from './groups.service'
import { GroupsController } from './groups.controller'
import { DatabaseService } from '../database/database.service'

@Module({
    providers: [GroupsService, DatabaseService],
    exports: [GroupsService],
    controllers: [GroupsController],
})
export class GroupsModule {}
