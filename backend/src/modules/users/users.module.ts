import { Module } from '@nestjs/common'
import { UsersService } from './users.service'
import { UsersController } from './users.controller'
import { DatabaseService } from '../database/database.service'
import { ConfigService } from '@nestjs/config'

@Module({
    providers: [UsersService, DatabaseService, ConfigService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
