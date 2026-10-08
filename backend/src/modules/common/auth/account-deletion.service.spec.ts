import { fakeDatabase } from '../../../../test/fake-database.js'

import { AccountDeletionService } from './account-deletion.service.js'

import type { ClerkIdentityService } from './clerk-identity.service.js'
import type { CacheService } from '../cache/cache.service.js'

function createService({ cleared = true, enabled = true } = {}) {
    const deleteAccount = vi.fn().mockResolvedValue(undefined)
    const cache = {
        deleteCachedData: vi.fn().mockResolvedValue(cleared),
        deleteAll: vi.fn().mockResolvedValue(true),
        isEnabled: vi.fn().mockReturnValue(enabled),
    }
    const clerk = {
        deleteClerkUser: vi.fn().mockResolvedValue(undefined),
        revokeInvitationsFrom: vi.fn().mockResolvedValue({ revoked: 0, failed: 0 }),
    }
    const service = new AccountDeletionService(
        fakeDatabase({
            deleteAccount,
            getUserByClerkId: vi.fn().mockResolvedValue({ rows: [{ id: 7, isDeleted: 0 }] }),
        }),
        cache as unknown as CacheService,
        clerk as unknown as ClerkIdentityService,
    )
    const warn = vi.spyOn((service as unknown as { logger: { warn: () => void } }).logger, 'warn').mockImplementation(() => undefined)

    return { service, deleteAccount, cache, warn }
}

describe('AccountDeletionService cache clean-up', () => {
    it('clears cached views after deleting, but never the whole Redis with its rate limits', async () => {
        const { service, deleteAccount, cache, warn } = createService()

        await service.deleteOwnAccount(7, 'user_7')

        expect(deleteAccount).toHaveBeenCalledWith(7)
        expect(cache.deleteCachedData).toHaveBeenCalledTimes(1)
        expect(cache.deleteAll).not.toHaveBeenCalled()
        expect(warn).not.toHaveBeenCalled()
    })

    it('does the same when Clerk deleted the user', async () => {
        const { service, deleteAccount, cache } = createService()

        await service.deleteAccountForClerkUser('user_7')

        expect(deleteAccount).toHaveBeenCalledWith(7)
        expect(cache.deleteCachedData).toHaveBeenCalledTimes(1)
        expect(cache.deleteAll).not.toHaveBeenCalled()
    })

    it('warns when the cache could not be cleared, and still finishes the deletion', async () => {
        const { service, warn } = createService({ cleared: false })

        await expect(service.deleteOwnAccount(7, 'user_7')).resolves.toBeUndefined()

        expect(warn).toHaveBeenCalledWith(
            'Deleted an account, but the cache could not be cleared; cached views expire on their own within a day',
        )
    })

    it('stays quiet when Redis is turned off, as in local development', async () => {
        const { service, warn } = createService({ cleared: false, enabled: false })

        await service.deleteOwnAccount(7, 'user_7')

        expect(warn).not.toHaveBeenCalled()
    })
})
