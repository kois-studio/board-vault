import { z } from 'zod'

// Zod schema for validating a single user
export const userSchema = z.object({
    id: z.number().int().nonnegative(),
    email: z.string().email(),
    password: z.string().min(8),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    alias: z.string().min(4),
    imageUrl: z.string().url(),
})

// Schema for validating an array of users
export const usersSchema = z.array(userSchema)
