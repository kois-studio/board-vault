import { Global, Module } from '@nestjs/common'

import { RateLimitGuard } from '../../../common/guards/rate-limit.guard.js'
import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'

import { ProblemsController } from './problems.controller.js'
import { ProblemsService } from './problems.service.js'

/** Problem reports (ADR-0028). Global, so the error filter and the daily job can reach the service. */
@Global()
@Module({
    imports: [CacheModule, DatabaseModule],
    providers: [ProblemsService, RateLimitGuard],
    exports: [ProblemsService],
    controllers: [ProblemsController],
})
export class ProblemsModule {}
