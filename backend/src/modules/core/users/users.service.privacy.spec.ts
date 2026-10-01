import { fakeDatabase } from '../../../../test/fake-database'

import { UsersService } from './users.service'

describe('UsersService account rows', () => {
    const avatar = {
        backgroundColor: '#3B82F6',
        iconName: 'person-fill',
        emoji: null,
        type: 'icon',
        initials: 'AL',
    }
    // libSQL rows expose columns by name. The order here differs from the
    // table on purpose, and the legacy `password` column (dropped by
    // migration 0015) must never reach a response.
    const accountRow = {
        clerkUserId: 'user_clerk_1',
        password: 'legacy-hash',
        isAdmin: 1,
        isDeleted: 0,
        created_at: '2026-01-01T00:00:00.000Z',
        displayName: 'Alice',
        avatar: JSON.stringify(avatar),
        username: 'alice',
        email: 'alice@example.test',
        id: 1,
    }
    const serviceWith = (row: object) => new UsersService(fakeDatabase({ getUserById: vi.fn().mockResolvedValue({ rows: [row] }) }))

    it('returns only public identity fields for nested user responses', async () => {
        await expect(serviceWith(accountRow).getPublicUserById(1)).resolves.toEqual({
            id: 1,
            username: 'alice',
            displayName: 'Alice',
            avatar,
        })
    })

    it('reads account columns by name and exposes no credential or Clerk fields', async () => {
        await expect(serviceWith(accountRow).getUserById(1)).resolves.toEqual({
            id: 1,
            email: 'alice@example.test',
            username: 'alice',
            displayName: 'Alice',
            avatar,
            createdAt: '2026-01-01T00:00:00.000Z',
            isDeleted: false,
            isAdmin: true,
        })
    })
})
