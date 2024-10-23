import { z } from 'zod'

export const gameReviewSchema = z.object({
    accountId: z.number().int().nonnegative(),
    gameId: z.number().int().nonnegative(),
    review: z.number().int().nonnegative(),
    reviewDate: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
})

export const gameReviewsSchema = z.array(gameReviewSchema)
