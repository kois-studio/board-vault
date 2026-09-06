import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

import { UsersService } from '../../core/users/users.service'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly LOGGER = new Logger(JwtStrategy.name)

    constructor(
        private readonly configService: ConfigService,
        private readonly usersService: UsersService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        })
    }

    async validate(payload: { sub: string; email: string; iat: number; exp: number }) {
        const user = await this.usersService.getUserById(Number(payload.sub))

        if (user.isDeleted) {
            this.LOGGER.warn('Rejected JWT for a deleted user')
            throw new UnauthorizedException('Account is unavailable')
        }

        return { userId: payload.sub, email: payload.email, isAdmin: user.isAdmin }
    }
}
