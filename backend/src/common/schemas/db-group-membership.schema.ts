import { z } from 'zod'

// Zod schema for validating a single user
export const groupMembreshipSchema = z.object({
    // the "primary key" is the composite of (accountId, groupId)
    accountId: z.number().int().nonnegative(), // ref: Account
    groupId: z.string(), // ref: UserGroup
    joinedAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
})

// Schema for validating an array of users
export const groupMembreshipsSchema = z.array(groupMembreshipSchema)
