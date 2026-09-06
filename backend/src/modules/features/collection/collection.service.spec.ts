import { ConflictException } from '@nestjs/common'

import { CollectionService } from './collection.service'

describe('CollectionService', () => {
    it('invalidates activity memory after atomic collection activation', async () => {
        const addGameToCollection = jest.fn().mockResolvedValue({ success: true, wishlistRemoved: true })
        const invalidateForAccount = jest.fn().mockResolvedValue(undefined)
        const service = new CollectionService(
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            { invalidateForAccount } as never,
            { addGameToCollection } as never,
        )

        await expect(service.addGameToUserCollection(1, 42)).resolves.toEqual({ success: true })

        expect(addGameToCollection).toHaveBeenCalledWith(1, 42)
        expect(invalidateForAccount).toHaveBeenCalledWith(1)
    })

    it('turns a duplicate atomic activation into the existing conflict contract', async () => {
        const addGameToCollection = jest.fn().mockResolvedValue({ success: false, wishlistRemoved: false })
        const invalidateForAccount = jest.fn()
        const service = new CollectionService(
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            {} as never,
            { invalidateForAccount } as never,
            { addGameToCollection } as never,
        )

        await expect(service.addGameToUserCollection(1, 42)).rejects.toBeInstanceOf(ConflictException)

        expect(invalidateForAccount).not.toHaveBeenCalled()
    })
})
