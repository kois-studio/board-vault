import { randomUUID } from 'node:crypto'

import { Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { JwtService } from '@nestjs/jwt'
import * as bcrypt from 'bcrypt'

import { UsersService } from '../../users/users.service'
import { DatabaseService } from '../database/database.service'
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

    async verifyEmail(token: string): Promise<boolean> {
        // Find the user associated with the verification token
        const user = await this.databaseService.findUserByVerificationToken(token)

        if (user.rows.length === 0) {
            return false // Invalid or expired token
        }

        const userId = user.rows[0]['id']

        if (Number.isNaN(userId)) {
            return false // Invalid or expired token
        }

        // Update the user's status to verified
        await this.databaseService.updateUser(Number(userId), {
            email_verified: true,
            verification_token: null,
        })

        return true // Email successfully verified
    }

    async forgotPassword(email: string): Promise<void> {
        // Check if the email exists in the database
        const user = await this.usersService.getUserByEmail(email, true)

        if (user instanceof Error || !user) {
            throw new NotFoundException('Email not found')
        }

        // Generate a unique password reset token
        const resetToken = randomUUID()

        // Store the reset token in the database with an expiration time
        await this.databaseService.updateUser(user.id, { password_reset_token: resetToken })

        // Send password reset email
        await this.emailService.sendPasswordResetEmail(email, resetToken)
    }

    async resetPassword(token: string, password: string): Promise<boolean> {
        const user = await this.databaseService.getUserByPasswordResetToken(token)

        if (user.rows.length === 0) {
            return false // Invalid or expired token
        }

        const userId = user.rows[0]['id']

        if (Number.isNaN(userId)) {
            return false // Invalid or expired token
        }

        await this.databaseService.updateUser(Number(userId), {
            password,
            password_reset_token: null,
        })

        return true
    }
}
