import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { UsersModule } from '../../core/users/users.module.js'
import { DatabaseModule } from '../database/database.module.js'

import { AuthController } from './auth.controller.js'
import { ClerkIdentityService } from './clerk-identity.service.js'
import { ClerkTokenVerifier } from './clerk-token-verifier.js'
import { ClerkWebhookController } from './clerk-webhook.controller.js'
import { ClerkWebhookService } from './clerk-webhook.service.js'

@Module({
    imports: [UsersModule, ConfigModule, DatabaseModule],
    controllers: [AuthController, ClerkWebhookController],
    providers: [ClerkIdentityService, ClerkTokenVerifier, ClerkWebhookService],
    exports: [ClerkIdentityService, ClerkTokenVerifier],
})
export class AuthModule {}
