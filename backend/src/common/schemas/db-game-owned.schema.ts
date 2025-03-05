import { z } from 'zod'

export const gameOwnedSchema = z.object({
    // the "primary key" is the composite of (accountId, gameId)
    accountId: z.number().int().nonnegative(), // ref: Account
    gameId: z.number().int().nonnegative(), // ref: Game
    purchasePrice: z.number().int().nonnegative(),
    purchaseDate: z.date(),
    purchaseNotes: z.string(),
})

export const gameOwnedsSchema = z.array(gameOwnedSchema)
