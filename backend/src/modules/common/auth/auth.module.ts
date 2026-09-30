import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { UsersModule } from '../../core/users/users.module'
import { DatabaseModule } from '../database/database.module'

import { AuthController } from './auth.controller'
import { ClerkIdentityService } from './clerk-identity.service'
import { ClerkTokenVerifier } from './clerk-token-verifier'
import { ClerkWebhookController } from './clerk-webhook.controller'
import { ClerkWebhookService } from './clerk-webhook.service'

@Module({
    imports: [UsersModule, ConfigModule, DatabaseModule],
    controllers: [AuthController, ClerkWebhookController],
    providers: [ClerkIdentityService, ClerkTokenVerifier, ClerkWebhookService],
    exports: [ClerkIdentityService, ClerkTokenVerifier],
})
export class AuthModule {}
