import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { MeetsController } from './meets.controller.js'
import { MeetsService } from './meets.service.js'

@Module({
    imports: [DatabaseModule],
    providers: [MeetsService],
    exports: [MeetsService],
    controllers: [MeetsController],
})
export class MeetsModule {}
