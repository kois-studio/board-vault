import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'

import { GameProposalService } from './game-proposal.service.js'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [GameProposalService],
    exports: [GameProposalService],
})
export class GameProposalModule {}
