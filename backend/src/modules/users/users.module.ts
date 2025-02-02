import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
// module dependencies
import { MeetsModule } from '../meets/meets.module'
import { DatabaseModule } from '../database/database.module'
import { GroupsModule } from '../groups/groups.module'
import { GroupMembershipsModule } from '../group-memberships/group-memberships.module'

@Module({
    imports: [MeetsModule, DatabaseModule, GroupsModule, GroupMembershipsModule],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
