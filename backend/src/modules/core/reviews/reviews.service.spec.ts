import { ReviewsService } from './reviews.service'

describe('ReviewsService', () => {
    it('uses the atomic review/activity write and invalidates review memory', async () => {
        const saveGameReviewAndLogActivity = jest.fn().mockResolvedValue({ success: true })
        const deleteOne = jest.fn().mockResolvedValue(undefined)
        const service = new ReviewsService({ saveGameReviewAndLogActivity } as never, { deleteOne } as never)

        await expect(service.saveGameReview(1, 42, 8)).resolves.toEqual({ success: true })

        expect(saveGameReviewAndLogActivity).toHaveBeenCalledWith(1, 42, 8)
        expect(deleteOne).toHaveBeenCalledWith('reviews:userReviewsWithGameData:1')
    })
})
