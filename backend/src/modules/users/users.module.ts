import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
// module dependencies
import { MeetsModule } from '../meets/meets.module'
import { DatabaseModule } from '../common/database/database.module'
import { GroupsModule } from '../core/groups/groups.module'

@Module({
    imports: [
        MeetsModule,
        DatabaseModule,
        GroupsModule,
    ],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
