import { Injectable, Logger } from '@nestjs/common'
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

    async validateUser(id: number, pass: string): Promise<any> {
        const user = await this.usersService.getUserById(id)

        if (!(user instanceof Error) && (await bcrypt.compare(pass, user.password))) {
            return user
        }
        return null
    }

    async login(user: any) {
        const payload = { email: user.email, sub: user.id }

        return {
            accessToken: this.jwtService.sign(payload),
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
