import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { DatabaseService } from '../database/database.service'

@Module({
    providers: [UsersService, DatabaseService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
