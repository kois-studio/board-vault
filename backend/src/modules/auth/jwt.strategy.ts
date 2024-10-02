import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    private readonly LOGGER = new Logger(JwtStrategy.name)

    constructor(private readonly configService: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get('JWT_SECRET'),
        })
        this.LOGGER.debug('JwtStrategy instantiated')
    }

    async validate(payload: { sub: string; email: string }) {
        this.LOGGER.debug(`JWT Payload: ${JSON.stringify(payload)}`)
        if (!payload) {
            this.LOGGER.error('Invalid JWT payload')
            return null
        }
        return { userId: payload.sub, email: payload.email }
    }
}
