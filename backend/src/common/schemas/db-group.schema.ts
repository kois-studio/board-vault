import { z } from 'zod'

export const groupSchema = z.object({
    id: z.number().int().nonnegative(),
    // The create form allows 2-40 characters; anything stored and non-empty must read back.
    name: z.string().min(1),
    createdBy: z.number().int().nonnegative(), // ref: Account
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
})

export const groupsSchema = z.array(groupSchema)
