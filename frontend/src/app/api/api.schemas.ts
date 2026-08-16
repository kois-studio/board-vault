import { z } from 'zod'

import type {
    GameCompleteType,
    GameType,
    GroupType,
    GroupWithMembersAndGames,
    HistoryRecordType,
    InvitationWithAccountsData,
    InvitationWithExtraData,
    MeetType,
    MeetWithAttendeesAndGamesType,
    NotificationType,
    PublicUserType,
    RecommendationsType,
    ScheduledSessionCreatedType,
    SessionAttendeesUpdatedType,
    SessionCreatedType,
    SessionStatusUpdatedType,
    UserStatsType,
} from './api.types'

export const authStatusSchema = z.object({
    isValid: z.literal(true),
    userId: z.number(),
    isAdmin: z.boolean(),
})

export const clerkAuthStatusSchema = authStatusSchema.extend({
    clerkUserId: z.string(),
})

export const accessTokenSchema = z.object({ access_token: z.string().min(1) })
export const availabilitySchema = z.object({ isAvailable: z.boolean() })
export const messageSchema = z.object({ message: z.string().min(1) })

const gameCompleteSchema: z.ZodType<GameCompleteType> = z.object({
    id: z.number(),
    title: z.string().optional(),
    imageUrl: z.string(),
    gameAvgDuration: z.number(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
    titleTranslations: z.object({
        en: z.string(),
        es: z.string(),
    }),
})

const gameSchema: z.ZodType<GameType> = z.object({
    id: z.number(),
    title: z.string().optional(),
    imageUrl: z.string(),
    gameAvgDuration: z.number(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
})

export const gamesSchema = z.array(gameSchema)
export const userGamesSchema = z.array(gameCompleteSchema)

const avatarSchema = z.object({
    backgroundColor: z.string(),
    iconName: z.string().nullable(),
    emoji: z.string().nullable(),
    type: z.enum(['icon', 'emoji', 'initials']),
    initials: z.string(),
})

const publicUserSchema = z.object({
    id: z.number(),
    username: z.string(),
    displayName: z.string(),
    avatar: avatarSchema,
})

const groupSchema: z.ZodType<GroupType> = z.object({
    id: z.number(),
    name: z.string(),
    createdBy: z.number(),
    createdAt: z.string(),
})

const gameReviewSchema = z.object({
    accountId: z.number(),
    gameId: z.number(),
    review: z.number(),
    reviewDate: z.string(),
})

const groupMemberSchema: z.ZodType<GroupWithMembersAndGames['members'][number]> = z.object({
    ...publicUserSchema.shape,
    joinedAt: z.string(),
    games: z.array(gameCompleteSchema),
    reviews: z.array(gameReviewSchema),
})

const groupWithMembersAndGamesSchema: z.ZodType<GroupWithMembersAndGames> = z.object({
    id: z.number(),
    name: z.string(),
    createdBy: z.number(),
    createdAt: z.string(),
    members: z.array(groupMemberSchema),
})

export const userGroupsSchema = z.array(groupWithMembersAndGamesSchema)

export const groupInvitationsSchema: z.ZodType<Array<InvitationWithAccountsData>> = z.array(
    z.object({
        id: z.number(),
        groupId: z.number(),
        fromAccountId: z.number(),
        toAccountId: z.number(),
        sentAt: z.string(),
        fromAccount: publicUserSchema,
        toAccount: publicUserSchema,
    }),
)

export const userInvitationsSchema: z.ZodType<Array<InvitationWithExtraData>> = z.array(
    z.object({
        id: z.number(),
        groupId: z.number(),
        fromAccountId: z.number(),
        toAccountId: z.number(),
        sentAt: z.string(),
        fromAccount: publicUserSchema,
        group: groupSchema,
    }),
)

const meetFields = z.object({
    id: z.number(),
    groupId: z.number(),
    createdBy: z.number(),
    meetDate: z.string(),
    isConfirmed: z.boolean(),
    status: z.enum(['scheduled', 'active', 'completed', 'cancelled']),
    timezone: z.string(),
})

export const meetSchema: z.ZodType<MeetType> = meetFields

export const meetDetailsSchema: z.ZodType<MeetWithAttendeesAndGamesType> = meetFields.extend({
    attendees: z.array(z.number()),
    playedGames: z.array(z.number()),
    plannedGames: z.array(z.number()),
    skippedGames: z.array(z.number()),
})

const historyRecordSchema: z.ZodType<HistoryRecordType> = z.object({
    meetData: meetFields,
    gamesPlayed: z.array(
        z.object({
            gameData: gameCompleteSchema,
            playedBy: z.array(publicUserSchema),
        }),
    ),
})

export const userHistorySchema = z.array(historyRecordSchema)

export const userMeetsSchema = z.array(meetFields)

export const userStatsSchema: z.ZodType<UserStatsType> = z.object({
    totalGamesValue: z.number(),
})

export const userNotificationsSchema: z.ZodType<Array<NotificationType>> = z.array(
    z.object({
        id: z.number(),
        accountId: z.number(),
        type: z.string(),
        message: z.string(),
        createdAt: z.string(),
        isRead: z.boolean(),
    }),
)

export const sessionCreatedSchema: z.ZodType<SessionCreatedType> = z.object({
    sessionId: z.number(),
    status: z.literal('completed'),
})

export const scheduledSessionCreatedSchema: z.ZodType<ScheduledSessionCreatedType> = z.object({
    sessionId: z.number(),
    status: z.literal('scheduled'),
})

export const sessionStatusUpdatedSchema: z.ZodType<SessionStatusUpdatedType> = z.object({
    sessionId: z.number(),
    status: z.enum(['scheduled', 'active', 'completed', 'cancelled']),
})

export const sessionAttendeesUpdatedSchema: z.ZodType<SessionAttendeesUpdatedType> = z.object({
    sessionId: z.number(),
    attendeeIds: z.array(z.number()),
})

export const recommendationsSchema: z.ZodType<RecommendationsType> = z.object({
    groupId: z.number(),
    attendeeIds: z.array(z.number()),
    availableMinutes: z.number().nullable(),
    recommendations: z.array(
        z.object({
            gameData: gameCompleteSchema,
            score: z.number(),
            explanation: z.object({
                reasons: z.array(z.string()),
                attendeeOwnerCount: z.number(),
                attendeeCount: z.number(),
                averageReview: z.number().nullable(),
                lastPlayedAt: z.string().nullable(),
            }),
        }),
    ),
    noResultReason: z.string().nullable(),
})

export const successSchema = z.object({ success: z.literal(true) })
