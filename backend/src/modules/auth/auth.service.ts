import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'
import { UsersService } from '../users/users.service'
import { DatabaseService } from '../database/database.service'
import { randomUUID } from 'node:crypto'
import { EmailService } from '../email/email.service'

@Injectable()
export class AuthService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    constructor(
        private readonly jwtService: JwtService,
        private readonly databaseService: DatabaseService,
        private readonly usersService: UsersService,
        private readonly emailService: EmailService,
    ) {}

    async validateUser(email: string, password: string) {
        const user = await this.usersService.getUserByEmail(email, true)

        if (!(user instanceof Error) && 'password' in user && (await bcrypt.compare(password, user.password))) {
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

    async register(email: string, username: string, password: string) {
        this.LOGGER.log(`Creating user ${username} - ${email}`)

        // Generate a unique verification token
        const verificationToken = randomUUID()

        // Create the user with the verification token
        const user = await this.usersService.createUser(
            {
                email,
                password,
                username,
                displayName: username,
                imageUrl: 'https://pbs.twimg.com/profile_images/1833050358479826944/A2qj0e6Z_400x400.jpg',
            },
            verificationToken,
        )

        if (user.success) {
            // Send verification email
            await this.emailService.sendVerificationEmail(email, verificationToken)
    
            return user
        }

    }

    async checkEmail(email: string): Promise<boolean> {
        const result = await this.databaseService.checkEmail(email)

        return !result.rows.length
    }

    async checkUsername(username: string): Promise<boolean> {
        const result = await this.databaseService.checkUsername(username)

        return !result.rows.length
    }
}
