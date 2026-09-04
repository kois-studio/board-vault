import { ForbiddenException, NotFoundException } from '@nestjs/common'

import { AuthService } from './auth.service'

describe('AuthService password reset', () => {
    const databaseService = {
        updateUserRecord: jest.fn(),
        resetPasswordWithToken: jest.fn(),
        verifyEmailToken: jest.fn(),
        checkEmail: jest.fn(),
        checkUsername: jest.fn(),
    }
    const usersService = {
        getUserByEmail: jest.fn(),
        createUser: jest.fn(),
    }
    const emailService = {
        sendPasswordResetEmail: jest.fn(),
        sendVerificationEmail: jest.fn(),
    }
    const jwtService = {
        sign: jest.fn().mockReturnValue('access-token'),
    }

    const createService = () => new AuthService(jwtService as never, databaseService as never, usersService as never, emailService as never)

    beforeEach(() => {
        jest.clearAllMocks()
    })

    it('does not reveal whether an email belongs to an account', async () => {
        usersService.getUserByEmail.mockRejectedValue(new NotFoundException('not found'))

        await expect(createService().forgotPassword('unknown@example.com')).resolves.toBeUndefined()

        expect(databaseService.updateUserRecord).not.toHaveBeenCalled()
        expect(emailService.sendPasswordResetEmail).not.toHaveBeenCalled()
    })

    it('creates and sends a reset token for an existing account', async () => {
        usersService.getUserByEmail.mockResolvedValue({ id: 7, email: 'known@example.com' })

        await expect(createService().forgotPassword('known@example.com')).resolves.toBeUndefined()

        expect(databaseService.updateUserRecord).toHaveBeenCalledWith(7, {
            password_reset_token: expect.any(String),
            password_reset_token_expires_at: expect.any(Number),
        })
        expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith('known@example.com', expect.any(String))
    })

    it('accepts an unexpired email verification token once', async () => {
        databaseService.verifyEmailToken.mockResolvedValueOnce({ rowsAffected: 1 }).mockResolvedValueOnce({ rowsAffected: 0 })

        await expect(createService().verifyEmail('550e8400-e29b-41d4-a716-446655440000')).resolves.toBe(true)
        await expect(createService().verifyEmail('550e8400-e29b-41d4-a716-446655440000')).resolves.toBe(false)

        expect(databaseService.verifyEmailToken).toHaveBeenCalledTimes(2)
    })

    it('accepts a password reset token once and rejects an expired or consumed token', async () => {
        databaseService.resetPasswordWithToken.mockResolvedValueOnce({ rowsAffected: 1 }).mockResolvedValueOnce({ rowsAffected: 0 })

        await expect(createService().resetPassword('550e8400-e29b-41d4-a716-446655440000', 'new-password')).resolves.toBe(true)
        await expect(createService().resetPassword('550e8400-e29b-41d4-a716-446655440000', 'new-password')).resolves.toBe(false)

        expect(databaseService.resetPasswordWithToken).toHaveBeenCalledTimes(2)
    })

    it('does not log email or username values during registration', async () => {
        usersService.createUser.mockResolvedValue({ success: true })
        const service = createService()
        const logger = (service as unknown as { LOGGER: { log: jest.Mock } }).LOGGER
        const log = jest.spyOn(logger, 'log')

        await service.register('known@example.com', 'known-user', 'password')

        expect(log).toHaveBeenCalledWith('Registration attempt received')
        expect(usersService.createUser).toHaveBeenCalledWith(expect.any(Object), expect.any(String), expect.any(Number))
        expect(log).not.toHaveBeenCalledWith(expect.stringContaining('known@example.com'))
        expect(log).not.toHaveBeenCalledWith(expect.stringContaining('known-user'))
    })

    it('does not authenticate an unverified legacy account', async () => {
        usersService.getUserByEmail.mockResolvedValue({
            email: 'pending@example.com',
            email_verified: false,
            password: 'password',
        })

        await expect(createService().validateUser('pending@example.com', 'password')).resolves.toBeNull()
    })

    it('blocks legacy registration when production self-registration is disabled', async () => {
        const previousNodeEnvironment = process.env.NODE_ENV
        const previousRegistrationSetting = process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED

        process.env.NODE_ENV = 'production'
        delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED

        try {
            await expect(createService().register('new@example.com', 'new-user', 'password')).rejects.toBeInstanceOf(ForbiddenException)
            await expect(createService().checkEmail('new@example.com')).rejects.toBeInstanceOf(ForbiddenException)
            await expect(createService().checkUsername('new-user')).rejects.toBeInstanceOf(ForbiddenException)
            expect(usersService.createUser).not.toHaveBeenCalled()
            expect(databaseService.checkEmail).not.toHaveBeenCalled()
            expect(databaseService.checkUsername).not.toHaveBeenCalled()
        } finally {
            if (previousNodeEnvironment === undefined) delete process.env.NODE_ENV
            else process.env.NODE_ENV = previousNodeEnvironment
            if (previousRegistrationSetting === undefined) delete process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED
            else process.env.BOARD_VAULT_SELF_REGISTRATION_ENABLED = previousRegistrationSetting
        }
    })
})
