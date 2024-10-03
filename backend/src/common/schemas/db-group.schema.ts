import { z } from 'zod'

export const groupSchema = z.object({
    id: z.number().int().nonnegative(),
    name: z.string().min(4),
    createdBy: z.number().int().nonnegative(), // ref: Account
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    is_deleted: z.boolean(),
})

export const groupsSchema = z.array(groupSchema)
