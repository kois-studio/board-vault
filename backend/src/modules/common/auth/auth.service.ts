import { randomUUID } from 'node:crypto'

import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcryptjs'

import { assertSelfRegistrationEnabled } from '../../../common/registration-policy'
import { UsersService } from '../../core/users/users.service'
import { DatabaseService } from '../database/database.service'
import { EmailService } from '../email/email.service'

@Injectable()
export class AuthService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)
    private readonly VERIFICATION_TOKEN_TTL_SECONDS = 24 * 60 * 60
    private readonly PASSWORD_RESET_TOKEN_TTL_SECONDS = 60 * 60

    constructor(
        private readonly jwtService: JwtService,
        private readonly databaseService: DatabaseService,
        private readonly usersService: UsersService,
        private readonly emailService: EmailService,
    ) {}

    async validateUser(email: string, password: string) {
        const user = await this.usersService.getUserByEmail(email, true)

        if (!(user instanceof Error) && user.email_verified && 'password' in user && (await bcrypt.compare(password, user.password))) {
            return user
        }
        return null
    }

    async login(email: string, password: string) {
        this.LOGGER.log('Login attempt received')
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
        assertSelfRegistrationEnabled()
        this.LOGGER.log('Registration attempt received')

        // Generate a unique verification token
        const verificationToken = randomUUID()
        const backgroundsPool = ['#3B82F6', '#F97316', '#F59E0B', '#10B981', '#06B6D4', '#8B5CF6', '#EC4899']
        const backgroundColor = backgroundsPool[Math.floor(Math.random() * backgroundsPool.length)]

        // Create the user with the verification token
        const user = await this.usersService.createUser(
            {
                email,
                password,
                username,
                displayName: username,
                avatar: {
                    backgroundColor,
                    iconName: 'person-fill',
                    emoji: null,
                    type: 'initials',
                    initials: username.slice(0, 2),
                },
            },
            verificationToken,
            this.getTokenExpiry(this.VERIFICATION_TOKEN_TTL_SECONDS),
        )

        if (user.success) {
            // Send verification email
            await this.emailService.sendVerificationEmail(email, verificationToken)

            return user
        }
    }

    async checkEmail(email: string): Promise<boolean> {
        assertSelfRegistrationEnabled()
        const result = await this.databaseService.checkEmail(email)

        return !result.rows.length
    }

    async checkUsername(username: string): Promise<boolean> {
        assertSelfRegistrationEnabled()
        const result = await this.databaseService.checkUsername(username)

        return !result.rows.length
    }

    async verifyEmail(token: string): Promise<boolean> {
        const result = await this.databaseService.verifyEmailToken(token)

        return result.rowsAffected === 1
    }

    async forgotPassword(email: string): Promise<void> {
        try {
            const user = await this.usersService.getUserByEmail(email)

            // Generate a unique password reset token
            const resetToken = randomUUID()

            // Store the reset token with an expiration time.
            await this.databaseService.updateUserRecord(user.id, {
                password_reset_token: resetToken,
                password_reset_token_expires_at: this.getTokenExpiry(this.PASSWORD_RESET_TOKEN_TTL_SECONDS),
            })

            // Send password reset email
            await this.emailService.sendPasswordResetEmail(email, resetToken)
        } catch (error) {
            if (error instanceof NotFoundException) {
                return
            }
            throw error
        }
    }

    async resetPassword(token: string, password: string): Promise<boolean> {
        const result = await this.databaseService.resetPasswordWithToken(token, password)

        return result.rowsAffected === 1
    }

    private getTokenExpiry(ttlSeconds: number): number {
        return Math.floor(Date.now() / 1000) + ttlSeconds
    }
}
