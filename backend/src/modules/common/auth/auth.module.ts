import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { UsersModule } from '../../core/users/users.module'
import { DatabaseModule } from '../database/database.module'

import { AuthController } from './auth.controller'
import { ClerkIdentityService } from './clerk-identity.service'
import { ClerkTokenVerifier } from './clerk-token-verifier'

@Module({
    imports: [UsersModule, ConfigModule, DatabaseModule],
    controllers: [AuthController],
    providers: [ClerkIdentityService, ClerkTokenVerifier],
    exports: [ClerkIdentityService, ClerkTokenVerifier],
})
export class AuthModule {}
