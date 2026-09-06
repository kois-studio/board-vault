import { EmailService } from './email.service'

type EmailServiceInternals = {
    LOGGER: { error: jest.Mock; log: jest.Mock }
    resend: { emails: { send: jest.Mock } }
    noReplyEmail: string
    appBaseUrl: string
}

describe('EmailService logging', () => {
    const recipient = 'person@example.com'

    const createService = (result: { data?: { id: string }; error?: unknown }) => {
        const service = Object.create(EmailService.prototype) as EmailService
        const internals = service as unknown as EmailServiceInternals

        internals.resend = { emails: { send: jest.fn().mockResolvedValue(result) } }
        internals.noReplyEmail = 'noreply@example.com'
        internals.appBaseUrl = 'https://example.com'
        internals.LOGGER = { error: jest.fn(), log: jest.fn() }
        return { service, internals }
    }

    it('does not log recipient addresses on successful password-reset delivery', async () => {
        const { service, internals } = createService({ data: { id: 'message-1' } })

        await service.sendPasswordResetEmail(recipient, 'reset-token')

        expect(internals.LOGGER.log).toHaveBeenCalledWith('Password reset email sent successfully')
        expect(internals.LOGGER.log).not.toHaveBeenCalledWith(expect.stringContaining(recipient))
    })

    it('does not log recipient addresses on provider failure', async () => {
        const { service, internals } = createService({ error: new Error('provider failure') })

        await expect(service.sendVerificationEmail(recipient, 'verification-token')).rejects.toThrow('provider failure')

        expect(internals.LOGGER.error).toHaveBeenCalledWith('Failed to send verification email (Error)')
        expect(internals.LOGGER.error).not.toHaveBeenCalledWith(expect.anything(), expect.anything())
        expect(internals.LOGGER.error).not.toHaveBeenCalledWith(expect.stringContaining(recipient), expect.anything())
    })

    it('escapes notification content before placing it in HTML', async () => {
        const { service, internals } = createService({ data: { id: 'message-2' } })

        await service.sendNotificationEmail(recipient, '<img src=x onerror="alert(1)"> & welcome')

        expect(internals.resend.emails.send).toHaveBeenCalledWith(
            expect.objectContaining({ html: '<p>&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; welcome</p>' }),
        )
    })
})
