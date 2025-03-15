import { Module } from '@nestjs/common'

import { DatabaseModule } from '../common/database/database.module'

import { UsersController } from './users.controller'
import { UsersService } from './users.service'

@Module({
    imports: [DatabaseModule],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
