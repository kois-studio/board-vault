import { Module } from '@nestjs/common'

import { DatabaseModule } from '../../common/database/database.module.js'

import { GameTagsService } from './game-tags.service.js'

@Module({
    imports: [DatabaseModule],
    providers: [GameTagsService],
    exports: [GameTagsService],
})
export class GameTagsModule {}
