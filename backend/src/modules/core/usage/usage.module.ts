import { Global, Module } from '@nestjs/common'
import { APP_INTERCEPTOR } from '@nestjs/core'

import { RateLimitGuard } from '../../../common/guards/rate-limit.guard.js'
import { CacheModule } from '../../common/cache/cache.module.js'
import { DatabaseModule } from '../../common/database/database.module.js'

import { MaintenanceController } from './maintenance.controller.js'
import { UsageController } from './usage.controller.js'
import { UsageInterceptor } from './usage.interceptor.js'
import { UsageService } from './usage.service.js'

/** Usage analytics (ADR-0021). Global, so sign-in and account deletion can record and forget without importing it. */
@Global()
@Module({
    imports: [CacheModule, DatabaseModule],
    providers: [UsageService, RateLimitGuard, { provide: APP_INTERCEPTOR, useClass: UsageInterceptor }],
    exports: [UsageService],
    controllers: [UsageController, MaintenanceController],
})
export class UsageModule {}
