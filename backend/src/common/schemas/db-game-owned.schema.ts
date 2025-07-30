import { z } from 'zod'

export const gameOwnedSchema = z.object({
    // the "primary key" is the composite of (accountId, gameId)
    accountId: z.number().int().nonnegative(), // ref: Account
    gameId: z.number().int().nonnegative(), // ref: Game
    purchasePrice: z.union([
        z.number().nonnegative(),
        z.string().transform((val) => {
            const num = parseFloat(val)
            if (isNaN(num) || num < 0) {
                throw new Error('Purchase price must be a positive number')
            }
            return num
        })
    ]).nullable(),
    purchaseDate: z
        .string()
        .refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' })
        .nullable(),
    purchaseNotes: z.string().nullable(),
})

export const gameOwnedsSchema = z.array(gameOwnedSchema)
