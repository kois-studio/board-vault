import { ConflictException } from '@nestjs/common'

import { fakeDatabase } from '../../../../test/fake-database'

import { CollectionService } from './collection.service'

function createService(database: unknown, collectionActivity = { invalidateForAccount: vi.fn().mockResolvedValue(undefined) }) {
    return new CollectionService(
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        {} as never,
        { getGameOwnedByAccountIdAndGameId: vi.fn() } as never,
        {} as never,
        {} as never,
        collectionActivity as never,
        fakeDatabase(database as object),
    )
}

describe('CollectionService', () => {
    it('invalidates activity memory after atomic collection activation', async () => {
        const addGameToCollection = vi.fn().mockResolvedValue({ success: true, wishlistRemoved: true })
        const invalidateForAccount = vi.fn().mockResolvedValue(undefined)
        const service = createService({ addGameToCollection }, { invalidateForAccount })

        await expect(service.addGameToUserCollection(1, 42)).resolves.toEqual({ success: true })

        expect(addGameToCollection).toHaveBeenCalledWith(1, 42)
        expect(invalidateForAccount).toHaveBeenCalledWith(1)
    })

    it('turns a duplicate atomic activation into the existing conflict contract', async () => {
        const addGameToCollection = vi.fn().mockResolvedValue({ success: false, wishlistRemoved: false })
        const invalidateForAccount = vi.fn()
        const service = createService({ addGameToCollection }, { invalidateForAccount })

        await expect(service.addGameToUserCollection(1, 42)).rejects.toBeInstanceOf(ConflictException)

        expect(invalidateForAccount).not.toHaveBeenCalled()
    })

    it('invalidates activity memory after atomic collection removal', async () => {
        const removeGameFromCollection = vi.fn().mockResolvedValue({ rowsAffected: 1 })
        const invalidateForAccount = vi.fn().mockResolvedValue(undefined)
        const service = createService({ removeGameFromCollection }, { invalidateForAccount })

        await expect(service.removeGameFromUserCollection(1, 42)).resolves.toEqual({ success: true })

        expect(removeGameFromCollection).toHaveBeenCalledWith(1, 42)
        expect(invalidateForAccount).toHaveBeenCalledWith(1)
    })

    it('returns refreshed ownership after an atomic metadata update', async () => {
        const updateGameOwnershipAndLogActivity = vi.fn().mockResolvedValue({ rowsAffected: 1 })
        const getGameOwnedByAccountIdAndGameId = vi.fn().mockResolvedValue({ accountId: 1, gameId: 42 })
        const invalidateForAccount = vi.fn().mockResolvedValue(undefined)
        const service = new CollectionService(
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            { getGameOwnedByAccountIdAndGameId } as never,
            {} as never,
            {} as never,
            { invalidateForAccount } as never,
            fakeDatabase({ updateGameOwnershipAndLogActivity }),
        )

        await expect(service.updateGameOwnership(1, 42, { purchaseNotes: 'Gift' })).resolves.toEqual({ accountId: 1, gameId: 42 })

        expect(updateGameOwnershipAndLogActivity).toHaveBeenCalledWith(1, 42, { purchaseNotes: 'Gift' })
        expect(invalidateForAccount).toHaveBeenCalledWith(1)
    })

    it('returns the atomic wishlist state and invalidates activity memory', async () => {
        const toggleWishlistAndLogActivity = vi.fn().mockResolvedValue(true)
        const invalidateForAccount = vi.fn().mockResolvedValue(undefined)
        const service = createService({ toggleWishlistAndLogActivity }, { invalidateForAccount })

        await expect(service.toggleWishlist(1, 42)).resolves.toBe(true)

        expect(toggleWishlistAndLogActivity).toHaveBeenCalledWith(1, 42)
        expect(invalidateForAccount).toHaveBeenCalledWith(1)
    })
})
