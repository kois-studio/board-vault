import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { UsersController } from './users.controller.js'
import { UsersService } from './users.service.js'

@Module({
    imports: [DatabaseModule],
    providers: [UsersService],
    exports: [UsersService],
    controllers: [UsersController],
})
export class UsersModule {}
