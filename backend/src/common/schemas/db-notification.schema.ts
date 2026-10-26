import { z } from 'zod'

import { GROUP_PERSON_CHANGES, NotificationTypeEnum } from '../../modules/core/notifications/notifications-enum.type.js'

const id = z.number().int()

// {account} scheduled / started / finished / cancelled the {meeting} of {group}
const sessionData = z.object({ account: id, group: id, meeting: id })
// Older proposal notifications may lack proposalId; the app links by createdGameId or duplicateOfGameId.
const proposalData = z.object({ gameTitle: z.string(), proposalId: id.optional() })

/** The `data` each type the API writes carries (NotificationDataMap). */
const DATA_BY_TYPE: Record<NotificationTypeEnum, z.ZodType> = {
    [NotificationTypeEnum.MEETING_SCHEDULED]: sessionData,
    [NotificationTypeEnum.SESSION_STARTED]: sessionData,
    [NotificationTypeEnum.SESSION_FINISHED]: sessionData,
    [NotificationTypeEnum.SESSION_CANCELLED]: sessionData,
    // {account} added {added[]} to and removed {removed[]} from their shelf; {group} is one you share
    [NotificationTypeEnum.SHELF_CHANGED]: z.object({ account: id, group: id, added: z.array(id), removed: z.array(id) }),
    // {account} joined {group}
    [NotificationTypeEnum.USER_JOINED_GROUP]: z.object({ account: id, group: id }),
    // {member} left {group}, or {account} removed them
    [NotificationTypeEnum.USER_LEFT_GROUP]: z.object({ account: id, group: id, member: id }),
    // {account} changed a game or preference you entered for {person} in {group} (ADR-0020)
    [NotificationTypeEnum.GROUP_PERSON_CHANGED]: z.object({
        account: id,
        group: id,
        person: id,
        game: id,
        change: z.enum(GROUP_PERSON_CHANGES).optional(),
    }),
    [NotificationTypeEnum.GAME_PROPOSAL_APPROVED]: proposalData.extend({ createdGameId: id.optional() }),
    [NotificationTypeEnum.GAME_PROPOSAL_SUBMITTED]: proposalData.extend({ submittedBy: id }),
    [NotificationTypeEnum.GAME_PROPOSAL_REJECTED]: proposalData.extend({ reviewNotes: z.string() }),
    [NotificationTypeEnum.GAME_PROPOSAL_DUPLICATE]: proposalData.extend({
        duplicateOfGameId: id,
        duplicateOfTitle: z.string(),
        reviewNotes: z.string().optional(),
    }),
}

const KNOWN_TYPES = new Set<string>(Object.values(NotificationTypeEnum))

/**
 * One stored notification. The type is any non-empty string: older rows carry types the API no
 * longer writes, and the app still shows them. For the types it writes, `data` must have that
 * type's shape, kept whole (no keys stripped) so the app can link where the notification points.
 */
export const notificationSchema = z
    .object({
        id,
        accountId: id, // ref: Account
        type: z.string().min(1),
        message: z.string().min(1),
        createdAt: z.string().refine(date => !isNaN(Date.parse(date)), { message: 'Invalid date format' }),
        isRead: z.boolean(),
        data: z.record(z.string(), z.unknown()),
    })
    .superRefine((notification, context) => {
        if (!KNOWN_TYPES.has(notification.type)) return
        const result = DATA_BY_TYPE[notification.type as NotificationTypeEnum].safeParse(notification.data)

        if (!result.success) context.addIssue({ code: 'custom', path: ['data'], message: `Unexpected data for ${notification.type}` })
    })

export const notificationsSchema = z.array(notificationSchema)
