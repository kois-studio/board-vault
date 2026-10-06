import { fakeDatabase } from '../../../../test/fake-database.js'

import { ReviewsService } from './reviews.service.js'

describe('ReviewsService', () => {
    it('uses the atomic review/activity write and invalidates review memory', async () => {
        const saveGameReviewAndLogActivity = vi.fn().mockResolvedValue({ success: true })
        const getAccountIdsSharingAGroupWith = vi.fn().mockResolvedValue({ rows: [] })
        const deleteOne = vi.fn().mockResolvedValue(undefined)
        const service = new ReviewsService(fakeDatabase({ saveGameReviewAndLogActivity, getAccountIdsSharingAGroupWith }), {
            deleteOne,
        } as never)

        await expect(service.saveGameReview(1, 42, 8)).resolves.toEqual({ success: true })

        expect(saveGameReviewAndLogActivity).toHaveBeenCalledWith(1, 42, 8)
        expect(deleteOne).toHaveBeenCalledWith('reviews:userReviewsWithGameData:1')
    })

    it('drops the cached averages the new rating feeds, for everyone sharing a group with the author', async () => {
        const saveGameReviewAndLogActivity = vi.fn().mockResolvedValue({ success: true })
        const getAccountIdsSharingAGroupWith = vi.fn().mockResolvedValue({ rows: [[1], [5], [6]] })
        const deleteOne = vi.fn().mockResolvedValue(undefined)
        const service = new ReviewsService(fakeDatabase({ saveGameReviewAndLogActivity, getAccountIdsSharingAGroupWith }), {
            deleteOne,
        } as never)

        await service.saveGameReview(6, 18, 10)

        expect(getAccountIdsSharingAGroupWith).toHaveBeenCalledWith(6)
        expect(deleteOne.mock.calls.map(([key]) => key).sort()).toEqual([
            'reviews:avgGlobalRating:18',
            'reviews:sharedGroupsRating:1:18',
            'reviews:sharedGroupsRating:5:18',
            'reviews:sharedGroupsRating:6:18',
            'reviews:userReviewsWithGameData:6',
        ])
    })

    it('still drops the author’s own averages when they share no group', async () => {
        const deleteOne = vi.fn().mockResolvedValue(undefined)
        const service = new ReviewsService(
            fakeDatabase({
                saveGameReviewAndLogActivity: vi.fn().mockResolvedValue({ success: true }),
                getAccountIdsSharingAGroupWith: vi.fn().mockResolvedValue({ rows: [] }),
            }),
            { deleteOne } as never,
        )

        await service.saveGameReview(6, 18, 10)

        expect(deleteOne).toHaveBeenCalledWith('reviews:avgGlobalRating:18')
        expect(deleteOne).toHaveBeenCalledWith('reviews:sharedGroupsRating:6:18')
    })

    it('keeps a saved rating saved when the averages cannot be invalidated', async () => {
        const deleteOne = vi.fn().mockResolvedValue(undefined)
        const service = new ReviewsService(
            fakeDatabase({
                saveGameReviewAndLogActivity: vi.fn().mockResolvedValue({ success: true }),
                getAccountIdsSharingAGroupWith: vi.fn().mockRejectedValue(new Error('database timeout')),
            }),
            { deleteOne } as never,
        )

        await expect(service.saveGameReview(6, 18, 10)).resolves.toEqual({ success: true })
        expect(deleteOne).toHaveBeenCalledWith('reviews:userReviewsWithGameData:6')
    })

    it('drops the cached averages when a rating is deleted', async () => {
        const deleteOne = vi.fn().mockResolvedValue(undefined)
        const service = new ReviewsService(
            fakeDatabase({
                deleteGameReviewById: vi.fn().mockResolvedValue({ rowsAffected: 1 }),
                getAccountIdsSharingAGroupWith: vi.fn().mockResolvedValue({ rows: [[5]] }),
            }),
            { deleteOne } as never,
        )

        await expect(service.deleteGameReviewById(6, 18)).resolves.toEqual({ success: true })
        expect(deleteOne).toHaveBeenCalledWith('reviews:avgGlobalRating:18')
        expect(deleteOne).toHaveBeenCalledWith('reviews:sharedGroupsRating:5:18')
        expect(deleteOne).toHaveBeenCalledWith('reviews:sharedGroupsRating:6:18')
    })

    it('caches the group average for an hour, since membership changes it too', async () => {
        const set = vi.fn().mockResolvedValue(undefined)
        const service = new ReviewsService(
            fakeDatabase({ getAvgGroupsRating: vi.fn().mockResolvedValue({ rows: [{ avgGroupsRating: 9, count: 2 }] }) }),
            { get: vi.fn().mockResolvedValue(null), set } as never,
        )

        await expect(service.getAvgGroupsRating(6, 18)).resolves.toEqual({ review: 9, count: 2 })
        expect(set).toHaveBeenCalledWith('reviews:sharedGroupsRating:6:18', { review: 9, count: 2 }, 'short')
    })
})
