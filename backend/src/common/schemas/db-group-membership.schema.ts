import { z } from 'zod'

export const groupMembreshipSchema = z.object({
    // the "primary key" is the composite of (accountId, groupId)
    accountId: z.number().int().nonnegative(), // ref: Account
    groupId: z.number().int().nonnegative(), // ref: UserGroup
    joinedAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
})

export const groupMembreshipsSchema = z.array(groupMembreshipSchema)
