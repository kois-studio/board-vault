import { Module } from '@nestjs/common'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { JwtModule } from '@nestjs/jwt'

import { ClerkAuthGuard } from '../../../common/guards/clerk-auth.guard'
import { RateLimitGuard } from '../../../common/guards/rate-limit.guard'
import { UsersModule } from '../../core/users/users.module'
import { CacheModule } from '../cache/cache.module'
import { DatabaseService } from '../database/database.service'
import { EmailModule } from '../email/email.module'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'
import { ClerkIdentityService } from './clerk-identity.service'
import { JwtStrategy } from './jwt-strategy'

@Module({
    imports: [
        UsersModule,
        EmailModule,
        CacheModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '48h' },
            }),
            inject: [ConfigService],
        }),
        ConfigModule,
    ],
    controllers: [AuthController],
    providers: [AuthService, ClerkIdentityService, JwtStrategy, ClerkAuthGuard, RateLimitGuard, DatabaseService],
    exports: [ClerkIdentityService],
})
export class AuthModule {}
