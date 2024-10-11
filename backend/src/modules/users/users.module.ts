import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { DatabaseService } from '../database/database.service'
import { GroupsService } from '../groups/groups.service'

@Module({
    providers: [UsersService, DatabaseService, GroupsService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
