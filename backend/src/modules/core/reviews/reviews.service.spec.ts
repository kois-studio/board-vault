import { fakeDatabase } from '../../../../test/fake-database.js'

import { ReviewsService } from './reviews.service.js'

describe('ReviewsService', () => {
    it('uses the atomic review/activity write and invalidates review memory', async () => {
        const saveGameReviewAndLogActivity = vi.fn().mockResolvedValue({ success: true })
        const deleteOne = vi.fn().mockResolvedValue(undefined)
        const service = new ReviewsService(fakeDatabase({ saveGameReviewAndLogActivity }), { deleteOne } as never)

        await expect(service.saveGameReview(1, 42, 8)).resolves.toEqual({ success: true })

        expect(saveGameReviewAndLogActivity).toHaveBeenCalledWith(1, 42, 8)
        expect(deleteOne).toHaveBeenCalledWith('reviews:userReviewsWithGameData:1')
    })
})
