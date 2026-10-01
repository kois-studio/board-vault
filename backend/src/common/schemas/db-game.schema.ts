import { z } from 'zod'

export const gameSchema = z.object({
    id: z.number().int().nonnegative(),
    // Empty when a game has no artwork.
    imageUrl: z.string().url().or(z.literal('')),
    gameAvgDuration: z.number().int().nonnegative(),
    minPlayers: z.number().int().nonnegative(),
    maxPlayers: z.number().int().nonnegative(),
})

export const gamesSchema = z.array(gameSchema)
