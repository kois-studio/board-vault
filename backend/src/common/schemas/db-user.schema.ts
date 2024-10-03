import { z } from 'zod'

// Zod schema for validating a single user
export const userSchema = z.object({
    id: z.number().int().nonnegative(),
    email: z.string().email(),
    password: z.string().min(8),
    username: z.string().min(4),
    display_name: z.string().min(4),
    imageUrl: z.string().url(),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    is_deleted: z.boolean(),
})

// Schema for validating an array of users
export const usersSchema = z.array(userSchema)
