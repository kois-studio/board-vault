import { z } from 'zod'

export const gamePlaySessionSchema = z.object({
    accountId: z.number().int().nonnegative(),
    gameId: z.number().int().nonnegative(),
    meetId: z.number().int().nonnegative(),
})

export const gamePlaySessionsSchema = z.array(gamePlaySessionSchema)
