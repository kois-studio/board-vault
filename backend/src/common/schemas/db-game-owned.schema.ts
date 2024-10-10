import { z } from 'zod'

export const gameOwnedSchema = z.object({
    // the "primary key" is the composite of (accountId, gameId)
    accountId: z.number().int().nonnegative(), // ref: Account
    gameId: z.number().int().nonnegative(), // ref: Game
})

export const gameOwnedsSchema = z.array(gameOwnedSchema)
