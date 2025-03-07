import { z } from 'zod'

export const wishlistedGameSchema = z.object({
    accountId: z.number(),
    gameId: z.number(),
    dateAdded: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    priority: z.number().int().nonnegative().min(1).max(5),
    notes: z.string().nullable(),
})

export const wishlistedGamesSchema = z.array(wishlistedGameSchema)
