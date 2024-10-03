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

    async validateUser(email: string, password: string) {
        const user = await this.usersService.getUserByEmail(email, true)

        if (!(user instanceof Error) && (await bcrypt.compare(password, user.password))) {
            return user
        }
        return null
    }

    async login(email: string, password: string) {
        this.LOGGER.log(`Logging in user ${email}`)
        const user = await this.validateUser(email, password)

        if (!user) {
            throw new UnauthorizedException('Invalid credentials')
        }

        const payload = { sub: user.id, email: user.email }

        return {
            access_token: this.jwtService.sign(payload),
        }
    }

    async register(email: string, username: string, password: string, display_name: string) {
        this.LOGGER.log(`Creating user ${username} - ${email}`)
        return this.usersService.createUser({
            email,
            password,
            username,
            display_name,
            imageUrl: 'https://pbs.twimg.com/profile_images/1833050358479826944/A2qj0e6Z_400x400.jpg',
        })
    }
}
