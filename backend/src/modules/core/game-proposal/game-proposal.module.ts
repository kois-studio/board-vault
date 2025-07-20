import { Module } from '@nestjs/common'

import { CacheModule } from '../../common/cache/cache.module'
import { DatabaseModule } from '../../common/database/database.module'

import { GameProposalService } from './game-proposal.service'

@Module({
    imports: [DatabaseModule, CacheModule],
    providers: [GameProposalService],
    exports: [GameProposalService],
})
export class GameProposalModule {}
