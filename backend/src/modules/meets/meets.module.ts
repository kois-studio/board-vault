import { Module } from '@nestjs/common'

import { DatabaseModule } from '../common/database/database.module'

import { MeetsController } from './meets.controller'
import { MeetsService } from './meets.service'

@Module({
    imports: [DatabaseModule],
    providers: [MeetsService],
    exports: [MeetsService],
    controllers: [MeetsController],
})
export class MeetsModule {}
