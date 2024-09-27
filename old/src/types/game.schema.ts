import { z } from 'zod'

export const GameSchema = z.object({
    name: z.string(), // unique key
    imageUrl: z.string(),
    gameDuration: z.number(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
})

export type GameType = z.infer<typeof GameSchema>
