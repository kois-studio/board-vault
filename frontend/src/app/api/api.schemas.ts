import { z } from 'zod'

import type {
    AdminGamesResultType,
    BrowseGamesResultType,
    ClerkGroupInvitationType,
    CollectionActivityWithGameDataType,
    GameCompleteType,
    GameOwnedType,
    GameProposalType,
    GameReviewWithGameData,
    GameType,
    GameViewType,
    GameWithTagsAndTranslationsType,
    GroupAcquisitionEntryType,
    GroupType,
    GroupWithMembersAndGames,
    HistoryRecordType,
    InvitationWithAccountsData,
    InvitationWithExtraData,
    MeetAttendeeStatusType,
    MeetAttendeeType,
    MeetGameType,
    MeetType,
    MeetWithAttendeesAndGamesType,
    NotificationType,
    PublicUserType,
    RecommendationSignalsType,
    RecommendationsType,
    ScheduledSessionCreatedType,
    SessionAttendanceUpdatedType,
    SessionAttendeesUpdatedType,
    SessionCreatedType,
    SessionPlayedGamesUpdatedType,
    SessionRsvpUpdatedType,
    SessionShortlistUpdatedType,
    SessionStatusUpdatedType,
    TagCategoryType,
    TagType,
    UserProposalStatsType,
    UserStatsType,
    UserType,
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

const paginationSchema = z.object({
    currentPage: z.number(),
    totalPages: z.number(),
    totalItems: z.number(),
    itemsPerPage: z.number(),
})

export const tagCategorySchema: z.ZodType<TagCategoryType> = z.object({
    id: z.number(),
    name: z.string(),
    tags: z.array(z.number()),
    gameCount: z.number(),
})

export const tagSchema: z.ZodType<TagType> = z.object({
    id: z.number(),
    name: z.string(),
    categoryId: z.number(),
    gameCount: z.number(),
})

const gameWithTagsAndTranslationsSchema: z.ZodType<GameWithTagsAndTranslationsType> = z.object({
    id: z.number(),
    imageUrl: z.string(),
    gameAvgDuration: z.number(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
    translations: z.object({ en: z.string(), es: z.string() }),
    tags: z.array(z.object({ id: z.number(), name: z.string(), categoryName: z.string() })),
})

export const adminTagCategoriesSchema = z.array(tagCategorySchema)
export const adminTagsSchema = z.array(tagSchema)

export const adminGamesSchema: z.ZodType<AdminGamesResultType> = z.object({
    games: z.array(gameWithTagsAndTranslationsSchema),
    pagination: paginationSchema,
})

export const browseGamesSchema: z.ZodType<BrowseGamesResultType> = z.object({
    games: z.array(gameCompleteSchema),
    pagination: paginationSchema,
})

export const gameOwnedSchema: z.ZodType<GameOwnedType> = z.object({
    accountId: z.number(),
    gameId: z.number(),
    purchaseDate: z.string().nullable(),
    purchasePrice: z.number().nullable(),
    purchaseNotes: z.string().nullable(),
})

const gameViewRatingSchema = z.object({
    userRating: z.number().nullable(),
    avgGroupsRating: z.object({ review: z.number(), count: z.number() }).nullable(),
    avgGlobalRating: z.object({ review: z.number(), count: z.number() }).nullable(),
})

export const gameViewSchema: z.ZodType<GameViewType> = z.object({
    gameData: gameCompleteSchema,
    ownedGameData: z
        .object({
            purchaseDate: z.string().nullable(),
            purchasePrice: z.number().nullable(),
            purchaseNotes: z.string().nullable(),
        })
        .nullable(),
    tags: z.array(z.object({ tag: z.string(), category: z.string() })),
    wishlistedGameData: z.object({ dateAdded: z.string(), notes: z.string() }).nullable(),
    ratingData: gameViewRatingSchema,
    similarGames: z.array(gameCompleteSchema),
})

const avatarSchema = z.object({
    backgroundColor: z.string(),
    iconName: z.string().nullable(),
    emoji: z.string().nullable(),
    type: z.enum(['icon', 'emoji', 'initials']),
    initials: z.string(),
})

export const publicUserSchema = z.object({
    id: z.number(),
    username: z.string(),
    displayName: z.string(),
    avatar: avatarSchema,
})

export const userSchema: z.ZodType<UserType> = z.object({
    ...publicUserSchema.shape,
    email: z.string().email(),
    createdAt: z.string(),
})

const groupSchema: z.ZodType<GroupType> = z.object({
    id: z.number(),
    name: z.string(),
    createdBy: z.number(),
    createdAt: z.string(),
})

const groupAcquisitionEntrySchema: z.ZodType<GroupAcquisitionEntryType> = z.object({
    gameData: gameCompleteSchema,
    interestedBy: z.array(publicUserSchema),
    interestCount: z.number().int().nonnegative(),
    ownerCount: z.number().int().nonnegative(),
    firstInterestedAt: z.string(),
})

export const groupAcquisitionBoardSchema = z.array(groupAcquisitionEntrySchema)

const gameReviewSchema = z.object({
    accountId: z.number(),
    gameId: z.number(),
    review: z.number(),
    reviewDate: z.string(),
})

const gameReviewWithGameDataSchema: z.ZodType<GameReviewWithGameData> = gameReviewSchema.extend({
    gameData: gameCompleteSchema,
})

export const userReviewsSchema = z.array(gameReviewWithGameDataSchema)

const collectionActivitySchema = z.object({
    id: z.number(),
    accountId: z.number(),
    gameId: z.number(),
    actionType: z.enum(['added', 'rated', 'wishlisted', 'unwishlisted', 'updated', 'removed']),
    actionDetails: z.object({ rating: z.number().nullable() }).nullable(),
    createdAt: z.string(),
})

const collectionActivityWithGameDataSchema: z.ZodType<CollectionActivityWithGameDataType> = collectionActivitySchema.extend({
    gameData: gameCompleteSchema,
})

export const userCollectionActivitySchema = z.array(collectionActivityWithGameDataSchema)

const gameProposalShape = z.object({
    id: z.number(),
    submittedBy: z.number(),
    status: z.enum(['pending', 'approved', 'rejected', 'duplicate']),
    title: z.string(),
    imageUrl: z.string().nullable(),
    gameAvgDuration: z.number().nullable(),
    minPlayers: z.number().nullable(),
    maxPlayers: z.number().nullable(),
    proposedTags: z.string().nullable(),
    notes: z.string().nullable(),
    reviewedBy: z.number().nullable(),
    reviewedAt: z.string().nullable(),
    reviewNotes: z.string().nullable(),
    createdGameId: z.number().nullable(),
    submittedAt: z.string(),
})

export const gameProposalSchema: z.ZodType<GameProposalType> = gameProposalShape

export const adminGameProposalSchema = gameProposalShape.extend({
    submitterId: z.number(),
    reviewerId: z.number().optional(),
})

export const userProposalsSchema = z.array(gameProposalSchema)
export const userProposalStatsSchema: z.ZodType<UserProposalStatsType> = z.object({
    totalProposals: z.number(),
    approvedProposals: z.number(),
    rejectedProposals: z.number(),
    duplicateProposals: z.number(),
    pendingProposals: z.number(),
    approvalRate: z.number(),
    reputationScore: z.number(),
})

export const adminGameProposalsSchema = z.object({
    proposals: z.array(adminGameProposalSchema),
    pagination: paginationSchema,
})
export const adminApprovalResponseSchema = z.object({
    success: z.boolean(),
    createdGameId: z.number().optional(),
})
export const adminSuccessResponseSchema = z.object({ success: z.boolean() })

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
        expiresAt: z.string(),
        fromAccount: publicUserSchema,
        toAccount: publicUserSchema,
    }),
)

export const clerkGroupInvitationSchema: z.ZodType<ClerkGroupInvitationType> = z.object({
    invitationId: z.string().min(1),
    emailAddress: z.string().email(),
    url: z.string().url(),
})

export const userInvitationsSchema: z.ZodType<Array<InvitationWithExtraData>> = z.array(
    z.object({
        id: z.number(),
        groupId: z.number(),
        fromAccountId: z.number(),
        toAccountId: z.number(),
        sentAt: z.string(),
        expiresAt: z.string(),
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
    notes: z.string().nullable(),
})

export const meetSchema: z.ZodType<MeetType> = meetFields

export const meetDetailsSchema: z.ZodType<MeetWithAttendeesAndGamesType> = meetFields.extend({
    attendees: z.array(z.number()),
    attendeeStatuses: z.array(
        z.object({
            accountId: z.number(),
            rsvpStatus: z.enum(['pending', 'accepted', 'declined']),
            attendanceStatus: z.enum(['unknown', 'attended', 'absent']),
        }) satisfies z.ZodType<MeetAttendeeStatusType>,
    ),
    playedGames: z.array(z.number()),
    plannedGames: z.array(z.number()),
    skippedGames: z.array(z.number()),
    playedGameParticipants: z.array(
        z.object({
            gameId: z.number(),
            participantIds: z.array(z.number()),
        }),
    ),
})

export const meetAttendeeSchema: z.ZodType<MeetAttendeeType> = z.object({
    meetId: z.number(),
    accountId: z.number(),
})

export const meetGameSchema: z.ZodType<MeetGameType> = z.object({
    meetId: z.number(),
    gameId: z.number(),
})

const historyRecordSchema: z.ZodType<HistoryRecordType> = z.object({
    meetData: meetFields,
    attendedBy: z.array(publicUserSchema),
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

export const sessionRsvpUpdatedSchema: z.ZodType<SessionRsvpUpdatedType> = z.object({
    sessionId: z.number(),
    rsvpStatus: z.enum(['pending', 'accepted', 'declined']),
})

export const sessionAttendanceUpdatedSchema: z.ZodType<SessionAttendanceUpdatedType> = z.object({
    sessionId: z.number(),
    attendedIds: z.array(z.number()),
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

export const sessionShortlistUpdatedSchema: z.ZodType<SessionShortlistUpdatedType> = z.object({
    sessionId: z.number(),
    plannedGameIds: z.array(z.number()),
})

export const sessionPlayedGamesUpdatedSchema: z.ZodType<SessionPlayedGamesUpdatedType> = z.object({
    sessionId: z.number(),
    playedGameIds: z.array(z.number()),
    skippedGameIds: z.array(z.number()),
    playedGameParticipants: z.array(
        z.object({
            gameId: z.number(),
            participantIds: z.array(z.number()),
        }),
    ),
})

export const recommendationsSchema: z.ZodType<RecommendationsType> = z.object({
    groupId: z.number(),
    attendeeIds: z.array(z.number()),
    availableMinutes: z.number().nullable(),
    decisionLens: z.enum(['balanced', 'fresh', 'favorite']),
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
                interestedCount: z.number(),
                notForUsCount: z.number(),
            }),
        }),
    ),
    noResultReason: z.string().nullable(),
})

export const recommendationSignalsSchema: z.ZodType<RecommendationSignalsType> = z.object({
    groupId: z.number(),
    signals: z.array(
        z.object({
            gameId: z.number(),
            interestedCount: z.number(),
            notForUsCount: z.number(),
            yourFeedback: z.enum(['interested', 'not_for_us']).nullable(),
            interestedBy: z.array(publicUserSchema),
            lastUpdatedAt: z.string(),
        }),
    ),
})

export const successSchema = z.object({ success: z.literal(true) })

export const wishlistResponseSchema = z.object({ isWishlisted: z.boolean() })
