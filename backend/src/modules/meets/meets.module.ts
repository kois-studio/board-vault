import { Module } from '@nestjs/common'
import { DatabaseService } from '../database/database.service'
import { MeetsService } from './meets.service'
import { MeetsController } from './meets.controller'

@Module({
    providers: [MeetsService, DatabaseService],
    exports: [MeetsService],
    controllers: [MeetsController],
})
export class MeetsModule {}
