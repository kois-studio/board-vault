import { DatabaseService } from '../../common/database/database.service'

import { UsersService } from './users.service'

describe('UsersService public response boundary', () => {
    it('returns only public identity fields for nested user responses', async () => {
        const databaseService = {
            getUserById: jest.fn().mockResolvedValue({
                rows: [
                    [
                        1,
                        'alice@example.com',
                        'alice',
                        'password-hash',
                        JSON.stringify({
                            backgroundColor: '#3B82F6',
                            iconName: 'person-fill',
                            emoji: null,
                            type: 'icon',
                            initials: 'AL',
                        }),
                        'Alice',
                        '2026-01-01T00:00:00.000Z',
                        0,
                        1,
                        1,
                        'verification-token',
                        'reset-token',
                    ],
                ],
            }),
        } as unknown as DatabaseService
        const service = new UsersService(databaseService)

        await expect(service.getPublicUserById(1)).resolves.toEqual({
            id: 1,
            username: 'alice',
            displayName: 'Alice',
            avatar: {
                backgroundColor: '#3B82F6',
                iconName: 'person-fill',
                emoji: null,
                type: 'icon',
                initials: 'AL',
            },
        })
    })

    it('does not expose database-only fields from an account response', async () => {
        const databaseService = {
            getUserById: jest.fn().mockResolvedValue({
                rows: [
                    [
                        1,
                        'alice@example.test',
                        'alice',
                        'password-hash',
                        JSON.stringify({
                            backgroundColor: '#3B82F6',
                            iconName: 'person-fill',
                            emoji: null,
                            type: 'icon',
                            initials: 'AL',
                        }),
                        'Alice',
                        '2026-01-01T00:00:00.000Z',
                        0,
                        1,
                        1,
                        'verification-token',
                        'reset-token',
                    ],
                ],
            }),
        } as unknown as DatabaseService
        const service = new UsersService(databaseService)

        const user = await service.getUserById(1)

        expect(user).not.toHaveProperty('password')
        expect(user).not.toHaveProperty('verification_token')
        expect(user).not.toHaveProperty('password_reset_token')
    })
})
