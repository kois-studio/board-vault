import { z } from 'zod'

export const userSchema = z.object({
    id: z.number().int().nonnegative(),
    email: z.string().email(),
    password: z.string().min(8),
    username: z.string().min(4),
    displayName: z.string().min(4),
    avatar: z.object({
        backgroundColor: z.string(),
        iconName: z.string().nullable(),
        emoji: z.string().nullable(),
        type: z.enum(['icon', 'emoji', 'initials']),
        initials: z.string(),
    }),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    isDeleted: z.boolean(),
    isAdmin: z.boolean(),
    email_verified: z.boolean(),
    verification_token: z.string().nullable(),
    password_reset_token: z.string().nullable(),
})

export const usersSchema = z.array(userSchema)
