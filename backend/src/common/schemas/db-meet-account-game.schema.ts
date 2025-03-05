import { z } from 'zod'

export const meetAccountGameSchema = z.object({
    accountId: z.number().int().nonnegative(),
    meetId: z.number().int().nonnegative(),
    gameId: z.number().int().nonnegative(),
})

export const meetAccountGamesSchema = z.array(meetAccountGameSchema)
