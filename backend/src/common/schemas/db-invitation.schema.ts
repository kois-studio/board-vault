import { z } from 'zod'

export const invitationSchema = z.object({
    id: z.number().int().nonnegative(),
    groupId: z.number().int().nonnegative(), // ref: Group
    fromAccountId: z.number().int().nonnegative(), // ref: Account
    toAccountId: z.number().int().nonnegative(), // ref: Account
    sentAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
})

export const invitationsSchema = z.array(invitationSchema)
