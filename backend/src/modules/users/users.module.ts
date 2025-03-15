import { Module } from '@nestjs/common'

import { DatabaseModule } from '../common/database/database.module'
import { GroupsModule } from '../core/groups/groups.module'
import { MeetsModule } from '../meets/meets.module'

import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
    imports: [MeetsModule, DatabaseModule, GroupsModule],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
