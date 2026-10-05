import { z } from 'zod'

import { NotificationTypeEnum } from '../../modules/core/notifications/notifications-enum.type.js'

export const notificationSchema = z.object({
    id: z.number().int(),
    accountId: z.number().int(), // ref: Account
    type: z.nativeEnum(NotificationTypeEnum),
    message: z.string().min(1),
    createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
    isRead: z.boolean(),
    data: z.union([
        // {account} scheduled a {meeting} for {group}
        z.object({
            account: z.number().int(),
            group: z.number().int(),
            meeting: z.number().int(),
        }),
        // {account} from {group} added {games[]}
        z.object({
            account: z.number().int(),
            group: z.number().int(),
            games: z.array(z.number().int()),
        }),
        // {account} joined {group}
        z.object({
            account: z.number().int(),
            group: z.number().int(),
        }),
    ]),
})

export const notificationsSchema = z.array(notificationSchema)
