import { z } from 'zod'

export const userSchema = z.object({
    id: z.number().int().nonnegative(),
    email: z.string().email(),
    username: z.string().min(4),
    // Ana, Pau or Leo are names too; the profile form asks for at least 1 character (#125).
    displayName: z.string().min(1),
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
})

export const usersSchema = z.array(userSchema)
