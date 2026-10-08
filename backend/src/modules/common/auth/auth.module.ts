import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { NotificationsModule } from '../../core/notifications/notifications.module.js'
import { UsersModule } from '../../core/users/users.module.js'
import { CacheModule } from '../cache/cache.module.js'
import { DatabaseModule } from '../database/database.module.js'

import { AccountDeletionService } from './account-deletion.service.js'
import { AuthController } from './auth.controller.js'
import { ClerkAccountSyncService } from './clerk-account-sync.service.js'
import { ClerkIdentityService } from './clerk-identity.service.js'
import { ClerkTokenVerifier } from './clerk-token-verifier.js'
import { ClerkWebhookController } from './clerk-webhook.controller.js'
import { ClerkWebhookService } from './clerk-webhook.service.js'

@Module({
    imports: [UsersModule, ConfigModule, DatabaseModule, CacheModule, NotificationsModule],
    controllers: [AuthController, ClerkWebhookController],
    providers: [AccountDeletionService, ClerkAccountSyncService, ClerkIdentityService, ClerkTokenVerifier, ClerkWebhookService],
    exports: [ClerkIdentityService, ClerkTokenVerifier],
})
export class AuthModule {}
