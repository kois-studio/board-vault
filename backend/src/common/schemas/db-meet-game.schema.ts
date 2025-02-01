import { z } from 'zod'

export const meetGameSchema = z.object({
    meetId: z.number().int().nonnegative(),
    gameId: z.number().int().nonnegative(),
})

export const meetGamesSchema = z.array(meetGameSchema)
