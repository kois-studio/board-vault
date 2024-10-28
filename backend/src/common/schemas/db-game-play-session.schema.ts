import { z } from 'zod'

export const gamePlaySessionSchema = z.object({
    id: z.number().int(),
    accountId: z.number().int().nonnegative(),
    gameId: z.number().int().nonnegative(),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
})

export const gamePlaySessionsSchema = z.array(gamePlaySessionSchema)
