import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { DatabaseService } from '../database/database.service'
import { GroupsService } from '../groups/groups.service'
import { GroupMembershipsService } from '../group-memberships/group-memberships.service'

@Module({
    providers: [UsersService, DatabaseService, GroupsService, GroupMembershipsService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
