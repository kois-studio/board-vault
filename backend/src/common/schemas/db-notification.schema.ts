import { z } from 'zod'

export const notificationSchema = z.object({
    id: z.number().int(),
    accountId: z.number().int(), // ref: Account
    type: z.string().min(1), // Type of notification, e.g., 'expelled', 'member_left'
    message: z.string().min(1),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    isRead: z.boolean(),
})

export const notificationsSchema = z.array(notificationSchema)
