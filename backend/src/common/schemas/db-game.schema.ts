import { z } from 'zod'

export const gameSchema = z.object({
    id: z.number().int().nonnegative(),
    title: z.string(),
    imageUrl: z.string().url(),
    gameAvgDuration: z.number().int().nonnegative(),
    minPlayers: z.number().int().nonnegative(),
    maxPlayers: z.number().int().nonnegative(),
})

export const gamesSchema = z.array(gameSchema)
