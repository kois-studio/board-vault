import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UsersService } from '../users/users.service'

@Injectable()
export class AuthService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(
        private readonly usersService: UsersService,
        private readonly jwtService: JwtService,
    ) {}

    private async _validateUser(email: string, password: string) {
        const user = await this.usersService.getUserByEmail(email)

        if (!(user instanceof Error) && (await bcrypt.compare(password, user.password))) {
            return user
        }
        return null
    }

    async login(email: string, password: string) {
        this.LOGGER.log(`Logging in user ${email}`)
        const user = await this._validateUser(email, password)

        if (!user) {
            throw new UnauthorizedException('Invalid credentials')
        }

        const payload = { sub: user.id, email: user.email }

        return {
            access_token: this.jwtService.sign(payload),
        }
    }

    async register(email: string, alias: string, password: string) {
        this.LOGGER.log(`Creating user ${alias} - ${email}`)
        return this.usersService.createUser({
            email,
            password,
            alias,
            imageUrl: 'https://pbs.twimg.com/profile_images/1833050358479826944/A2qj0e6Z_400x400.jpg',
        })
    }
}
