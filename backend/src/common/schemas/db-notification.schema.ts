import { z } from 'zod'

export const nnotificationSchema = z.object({
    id: z.number().int(),
    accountId: z.number().int(), // ref: Account
    type: z.string().min(1), // Type of notification, e.g., 'expelled', 'member_left'
    relatedUserGroupId: z.number().int().nullable(), // ref: Group (nullable)
    relatedGameId: z.number().int().nullable(), // ref: Game (nullable)
    message: z.string().min(1),
    createdAt: z.string().datetime(),
    isRead: z.boolean(),
})

export const nnotificationsSchema = z.array(nnotificationSchema)
