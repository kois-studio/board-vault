import { z } from 'zod'

// Zod schema for validating a single user
export const groupSchema = z.object({
    id: z.number().int().nonnegative(),
    name: z.string().min(4),
    createdBy: z.number().int().nonnegative(),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    is_deleted: z.boolean(),
})

// Schema for validating an array of users
export const groupsSchema = z.array(groupSchema)
