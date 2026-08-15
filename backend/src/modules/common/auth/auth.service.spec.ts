import { NotFoundException } from '@nestjs/common'

import { AuthService } from './auth.service'

describe('AuthService password reset', () => {
    const databaseService = {
        updateUserRecord: jest.fn(),
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
        })
        expect(emailService.sendPasswordResetEmail).toHaveBeenCalledWith('known@example.com', expect.any(String))
    })

    it('does not log email or username values during registration', async () => {
        usersService.createUser.mockResolvedValue({ success: true })
        const service = createService()
        const logger = (service as unknown as { LOGGER: { log: jest.Mock } }).LOGGER
        const log = jest.spyOn(logger, 'log')

        await service.register('known@example.com', 'known-user', 'password')

        expect(log).toHaveBeenCalledWith('Registration attempt received')
        expect(log).not.toHaveBeenCalledWith(expect.stringContaining('known@example.com'))
        expect(log).not.toHaveBeenCalledWith(expect.stringContaining('known-user'))
    })
})
