import { UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

import { UsersService } from '../../core/users/users.service'

import { JwtStrategy } from './jwt-strategy'

describe('JwtStrategy account availability', () => {
    const configService = {
        getOrThrow: jest.fn().mockReturnValue('test-secret'),
    } as unknown as ConfigService

    it('accepts an active account and keeps the admin claim', async () => {
        const usersService = {
            getUserById: jest.fn().mockResolvedValue({ id: 7, isAdmin: true, isDeleted: false }),
        } as unknown as UsersService
        const strategy = new JwtStrategy(configService, usersService)

        await expect(strategy.validate({ sub: '7', email: 'user@example.com', iat: 1, exp: 2 })).resolves.toEqual({
            userId: '7',
            email: 'user@example.com',
            isAdmin: true,
        })
    })

    it('rejects a JWT belonging to a soft-deleted account', async () => {
        const usersService = {
            getUserById: jest.fn().mockResolvedValue({ id: 7, isAdmin: false, isDeleted: true }),
        } as unknown as UsersService
        const strategy = new JwtStrategy(configService, usersService)

        await expect(strategy.validate({ sub: '7', email: 'user@example.com', iat: 1, exp: 2 })).rejects.toThrow(UnauthorizedException)
    })
})
