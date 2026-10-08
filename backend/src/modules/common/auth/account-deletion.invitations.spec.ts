import { fakeDatabase } from '../../../../test/fake-database.js'

import { AccountDeletionService } from './account-deletion.service.js'

import type { ClerkIdentityService } from './clerk-identity.service.js'
import type { CacheService } from '../cache/cache.service.js'

describe('AccountDeletionService and the invitations an account sent', () => {
    const setup = (revoke: () => Promise<{ revoked: number; failed: number }>) => {
        const clerk = { deleteClerkUser: vi.fn().mockResolvedValue(undefined), revokeInvitationsFrom: vi.fn(revoke) }
        const service = new AccountDeletionService(
            fakeDatabase({
                deleteAccount: vi.fn().mockResolvedValue({ deletedGroupIds: [] }),
                getUserByClerkId: vi.fn().mockResolvedValue({ rows: [{ id: 7, isDeleted: 0 }] }),
            }),
            {
                deleteAll: vi.fn().mockResolvedValue(true),
                deleteCachedData: vi.fn().mockResolvedValue(true),
                isEnabled: () => false,
            } as unknown as CacheService,
            clerk as unknown as ClerkIdentityService,
        )
        const warn = vi.spyOn((service as unknown as { logger: { warn: () => void } }).logger, 'warn').mockImplementation(() => undefined)

        return { service, clerk, warn }
    }

    it('revokes them in Clerk when the person deletes their account', async () => {
        const { service, clerk, warn } = setup(async () => ({ revoked: 2, failed: 0 }))

        await service.deleteOwnAccount(7, 'user_7')

        expect(clerk.revokeInvitationsFrom).toHaveBeenCalledWith(7)
        expect(clerk.deleteClerkUser).toHaveBeenCalledWith('user_7')
        expect(warn).not.toHaveBeenCalled()
    })

    it('revokes them when Clerk deleted the user', async () => {
        const { service, clerk } = setup(async () => ({ revoked: 1, failed: 0 }))

        await service.deleteAccountForClerkUser('user_7')

        expect(clerk.revokeInvitationsFrom).toHaveBeenCalledWith(7)
    })

    it('still deletes the account and its Clerk user when Clerk cannot revoke them, and says so', async () => {
        const { service, clerk, warn } = setup(async () => ({ revoked: 1, failed: 1 }))

        await expect(service.deleteOwnAccount(7, 'user_7')).resolves.toBeUndefined()

        expect(clerk.deleteClerkUser).toHaveBeenCalledWith('user_7')
        expect(warn).toHaveBeenCalledWith('Deleted an account, but some of its group invitations could not be revoked in Clerk')
    })

    it('still deletes the account when Clerk cannot list them', async () => {
        const { service, clerk, warn } = setup(() => Promise.reject(new Error('Clerk unavailable')))

        await expect(service.deleteOwnAccount(7, 'user_7')).resolves.toBeUndefined()

        expect(clerk.deleteClerkUser).toHaveBeenCalledWith('user_7')
        expect(warn).toHaveBeenCalledWith('Deleted an account, but its group invitations could not be read from Clerk to revoke them')
    })
})
