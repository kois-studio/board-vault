import { Injectable, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Resend } from 'resend'

@Injectable()
export class EmailService {
    private readonly LOGGER: Logger = new Logger(this.constructor.name)

    // Email config
    private readonly resend: Resend
    private readonly noReplyEmail = this.configService.get<string>('NO_REPLY_EMAIL') || 'noreply@board-vault.com'
    private readonly appBaseUrl = this.configService.get<string>('APP_BASE_URL') || 'https://board-vault.com'

    constructor(private readonly configService: ConfigService) {
        const resendApiKey = this.configService.get<string>('RESEND_API_KEY')

        if (!resendApiKey) {
            this.LOGGER.error('RESEND_API_KEY is not defined in the environment variables.')
            throw new Error('RESEND_API_KEY is not defined.')
        }

        this.resend = new Resend(resendApiKey)
    }

    async sendVerificationEmail(to: string, verificationToken: string): Promise<void> {
        const verificationLink = `${this.appBaseUrl}/verify-email/${verificationToken}`

        try {
            const { data, error } = await this.resend.emails.send({
                from: this.noReplyEmail,
                to: [to],
                subject: 'Verify Your Email Address',
                html: `<p>Please click the following link to verify your email address: <a href="${verificationLink}">${verificationLink}</a></p>`,
            })

            this.LOGGER.log(`Verification email sent to ${to}. Message ID: ${data!.id}`)
        } catch (error) {
            this.LOGGER.error(`Failed to send verification email to ${to}`, error)
            throw error // Re-throw the error to be handled by the calling function
        }
    }

    async sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
        const resetLink = `${this.appBaseUrl}/reset-password/${resetToken}`

        try {
            const { data, error } = await this.resend.emails.send({
                from: this.noReplyEmail,
                to: [to],
                subject: 'Reset Your Password',
                html: `<p>Please click the following link to reset your password: <a href="${resetLink}">${resetLink}</a></p>`,
            })

            this.LOGGER.log(`Password reset email sent to ${to}. Message ID: ${data!.id}`)
        } catch (error) {
            this.LOGGER.error(`Failed to send password reset email to ${to}`, error)
            throw error // Re-throw the error to be handled by the calling function
        }
    }

    async sendNotificationEmail(to: string, message: string): Promise<void> {
        try {
            const { data, error } = await this.resend.emails.send({
                from: this.noReplyEmail,
                to: [to],
                subject: 'Important Notification',
                html: `<p>${message}</p>`,
            })

            this.LOGGER.log(`Notification email sent to ${to}. Message ID: ${data!.id}`)
        } catch (error) {
            this.LOGGER.error(`Failed to send notification email to ${to}`, error)
            throw error // Re-throw the error to be handled by the calling function
        }
    }
}
