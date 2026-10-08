import * as z from 'zod/mini'
import { resolveArtworkUrl } from '../core/utils/artworkUrl'
import type {
    AccountMeetType,
    AdminGameProposalsType,
    AdminGamesResultType,
    AdminGameType,
    AdminOverviewType,
    BrowseGamesResultType,
    CatalogueTagType,
    ClerkGroupInvitationSummaryType,
    ClerkGroupInvitationType,
    ClerkSyncResultType,
    CollectionActivityWithGameDataType,
    CreatedGroupType,
    GameCompleteType,
    GameOwnedType,
    GameProposalType,
    GameResultsUpdatedType,
    GameReviewWithGameData,
    GameType,
    GameViewType,
    GroupAcquisitionEntryType,
    GroupCollectionType,
    GroupInsightsType,
    GroupType,
    GroupWithMembersAndGames,
    HistoryRecordType,
    InvitationWithAccountsData,
    InvitationWithExtraData,
    MeetAttendeeStatusType,
    MeetType,
    MeetWithAttendeesAndGamesType,
    NotificationType,
    RecommendationSignalsType,
    RecommendationsType,
    ScheduledSessionCreatedType,
    SessionAttendanceUpdatedType,
    SessionAttendeesUpdatedType,
    SessionCreatedType,
    SessionGameBringersUpdatedType,
    SessionGameProposedType,
    SessionGameVotesUpdatedType,
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

/** A game's artwork: stored artwork arrives as a path on the API and leaves here as a full address. */
const artworkUrlSchema = z.pipe(
    z.string(),
    z.transform((imageUrl) => resolveArtworkUrl(imageUrl)),
)

export const clerkAuthStatusSchema = z.object({
    isValid: z.literal(true),
    userId: z.number(),
    isAdmin: z.boolean(),
    clerkUserId: z.string(),
})

export const gameCompleteSchema: z.ZodMiniType<GameCompleteType> = z.object({
    id: z.number(),
    title: z.optional(z.string()),
    imageUrl: artworkUrlSchema,
    gameAvgDuration: z.number(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
    titleTranslations: z.object({
        en: z.string(),
        es: z.string(),
    }),
})

const gameSchema: z.ZodMiniType<GameType> = z.object({
    id: z.number(),
    title: z.optional(z.string()),
    imageUrl: artworkUrlSchema,
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

export const tagCategorySchema: z.ZodMiniType<TagCategoryType> = z.object({
    id: z.number(),
    name: z.string(),
    tags: z.array(z.number()),
    gameCount: z.number(),
})

export const tagSchema: z.ZodMiniType<TagType> = z.object({
    id: z.number(),
    name: z.string(),
    categoryId: z.number(),
    gameCount: z.number(),
})

export const adminTagCategoriesSchema = z.array(tagCategorySchema)
export const adminTagsSchema = z.array(tagSchema)

export const catalogueTagsSchema: z.ZodMiniType<Array<CatalogueTagType>> = z.array(
    z.object({ id: z.number(), name: z.string(), categoryName: z.string(), gameCount: z.number() }),
)

export const adminGameSchema: z.ZodMiniType<AdminGameType> = z.object({
    id: z.number(),
    title: z.string(),
    imageUrl: artworkUrlSchema,
    gameAvgDuration: z.number(),
    minPlayers: z.number(),
    maxPlayers: z.number(),
    translations: z.object({ en: z.string(), es: z.string() }),
    tags: z.array(z.object({ id: z.number(), name: z.string(), categoryName: z.string() })),
    issues: z.array(z.enum(['no-title', 'no-artwork', 'no-spanish', 'no-tags', 'no-price'])),
    artworkSource: z.nullable(z.string()),
    retailPrice: z.nullable(z.number()),
})

export const adminGamesSchema: z.ZodMiniType<AdminGamesResultType> = z.object({
    games: z.array(adminGameSchema),
    pagination: paginationSchema,
})

const rankedGamesSchema = z.array(z.object({ gameId: z.number(), title: z.string(), count: z.number() }))

export const adminOverviewSchema: z.ZodMiniType<AdminOverviewType> = z.object({
    proposals: z.object({ pending: z.number(), oldestPendingAt: z.nullable(z.string()) }),
    catalogueIssues: z.object({
        'no-title': z.number(),
        'no-artwork': z.number(),
        'no-spanish': z.number(),
        'no-tags': z.number(),
        'no-price': z.number(),
    }),
    tags: z.object({ unused: z.number(), emptyCategories: z.number() }),
    catalogue: z.object({
        games: z.number(),
        approvedLast30Days: z.number(),
        mostOwned: rankedGamesSchema,
        mostWantedUnowned: rankedGamesSchema,
    }),
    recentDecisions: z.array(
        z.object({
            proposalId: z.number(),
            title: z.string(),
            status: z.enum(['approved', 'rejected', 'duplicate']),
            reviewedAt: z.string(),
            reviewerName: z.nullable(z.string()),
            createdGameId: z.nullable(z.number()),
        }),
    ),
})

export const mergeTagResultSchema = z.object({ gamesMoved: z.number() })

export const browseGamesSchema: z.ZodMiniType<BrowseGamesResultType> = z.object({
    games: z.array(gameCompleteSchema),
    pagination: paginationSchema,
})

export const gameOwnedSchema: z.ZodMiniType<GameOwnedType> = z.object({
    accountId: z.number(),
    gameId: z.number(),
    purchaseDate: z.nullable(z.string()),
    purchasePrice: z.nullable(z.number()),
    purchaseNotes: z.nullable(z.string()),
})

const gameViewRatingSchema = z.object({
    userRating: z.nullable(z.number()),
    avgGroupsRating: z.nullable(z.object({ review: z.number(), count: z.number() })),
    avgGlobalRating: z.nullable(z.object({ review: z.number(), count: z.number() })),
})

export const gameViewSchema: z.ZodMiniType<GameViewType> = z.object({
    gameData: gameCompleteSchema,
    ownedGameData: z.nullable(
        z.object({
            purchaseDate: z.nullable(z.string()),
            purchasePrice: z.nullable(z.number()),
            purchaseNotes: z.nullable(z.string()),
        }),
    ),
    tags: z.array(z.object({ tag: z.string(), category: z.string() })),
    wishlistedGameData: z.nullable(z.object({ dateAdded: z.string(), notes: z.string() })),
    ratingData: gameViewRatingSchema,
    similarGames: z.array(gameCompleteSchema),
})

const avatarSchema = z.object({
    backgroundColor: z.string(),
    iconName: z.nullable(z.string()),
    emoji: z.nullable(z.string()),
    type: z.enum(['icon', 'emoji', 'initials']),
    initials: z.string(),
})

/** Where someone stands in a group (ADR-0018); absent from older API responses, which means a member. */
const standingSchema = z.optional(z.enum(['member', 'left', 'deleted']))

export const publicUserSchema = z.object({
    id: z.number(),
    username: z.string(),
    displayName: z.string(),
    avatar: avatarSchema,
})

export const userSchema: z.ZodMiniType<UserType> = z.object({
    ...publicUserSchema.shape,
    email: z.email(),
    createdAt: z.string(),
})

const groupSchema: z.ZodMiniType<GroupType> = z.object({
    id: z.number(),
    name: z.string(),
    createdBy: z.number(),
    createdAt: z.string(),
})

const groupAcquisitionEntrySchema: z.ZodMiniType<GroupAcquisitionEntryType> = z.object({
    gameData: gameCompleteSchema,
    interestedBy: z.array(publicUserSchema),
    interestCount: z.int().check(z.nonnegative()),
    ownerCount: z.int().check(z.nonnegative()),
    firstInterestedAt: z.string(),
    decisionStatus: z.enum(['open', 'planned', 'not_now']),
    decisionAt: z.nullable(z.string()),
    decisionBy: z.nullable(publicUserSchema),
})

export const groupAcquisitionBoardSchema = z.array(groupAcquisitionEntrySchema)

export const groupCollectionSchema: z.ZodMiniType<GroupCollectionType> = z.object({
    worth: z.number(),
    copies: z.number(),
    pricedCopies: z.number(),
    people: z.array(
        z.object({
            accountId: z.nullable(z.number()),
            groupPersonId: z.nullable(z.number()),
            displayName: z.string(),
            avatar: z.nullable(avatarSchema),
            games: z.array(gameCompleteSchema),
            worth: z.number(),
            pricedGames: z.number(),
        }),
    ),
})

export const groupInsightsSchema: z.ZodMiniType<GroupInsightsType> = z.object({
    sessions: z.number(),
    gamesPlayed: z.number(),
    gamesWithWinner: z.number(),
    standings: z.array(
        z.object({
            accountId: z.nullable(z.number()),
            groupPersonId: z.nullable(z.number()),
            displayName: z.string(),
            avatar: z.nullable(avatarSchema),
            sessions: z.number(),
            gamesPlayed: z.number(),
            wins: z.number(),
        }),
    ),
    mostPlayed: z.array(z.object({ gameData: gameCompleteSchema, sessions: z.number(), lastPlayedAt: z.string() })),
    neverPlayed: z.array(gameCompleteSchema),
    neverPlayedCount: z.number(),
})

const gameReviewSchema = z.object({
    accountId: z.number(),
    gameId: z.number(),
    review: z.number(),
    reviewDate: z.string(),
})

const gameReviewWithGameDataSchema: z.ZodMiniType<GameReviewWithGameData> = z.extend(gameReviewSchema, {
    gameData: gameCompleteSchema,
})

export const userReviewsSchema = z.array(gameReviewWithGameDataSchema)

const collectionActivitySchema = z.object({
    id: z.number(),
    accountId: z.number(),
    gameId: z.number(),
    actionType: z.enum(['added', 'rated', 'wishlisted', 'unwishlisted', 'updated', 'removed']),
    actionDetails: z.nullable(z.object({ rating: z.nullable(z.number()) })),
    createdAt: z.string(),
})

const collectionActivityWithGameDataSchema: z.ZodMiniType<CollectionActivityWithGameDataType> = z.extend(collectionActivitySchema, {
    gameData: gameCompleteSchema,
})

export const userCollectionActivitySchema = z.array(collectionActivityWithGameDataSchema)

const gameProposalShape = z.object({
    id: z.number(),
    submittedBy: z.number(),
    status: z.enum(['pending', 'approved', 'rejected', 'duplicate']),
    title: z.string(),
    imageUrl: z.nullable(z.string()),
    gameAvgDuration: z.nullable(z.number()),
    minPlayers: z.nullable(z.number()),
    maxPlayers: z.nullable(z.number()),
    proposedTags: z.nullable(z.string()),
    notes: z.nullable(z.string()),
    reviewedBy: z.nullable(z.number()),
    reviewedAt: z.nullable(z.string()),
    reviewNotes: z.nullable(z.string()),
    createdGameId: z.nullable(z.number()),
    submittedAt: z.string(),
    addTo: z.optional(z.nullable(z.enum(['shelf', 'wishlist']))),
})

export const gameProposalSchema: z.ZodMiniType<GameProposalType> = gameProposalShape

export const adminGameProposalSchema = z.extend(gameProposalShape, {
    submitterId: z.number(),
    reviewerId: z.optional(z.number()),
})

export const userProposalsSchema = z.array(gameProposalSchema)
export const userProposalStatsSchema: z.ZodMiniType<UserProposalStatsType> = z.object({
    totalProposals: z.number(),
    approvedProposals: z.number(),
    rejectedProposals: z.number(),
    duplicateProposals: z.number(),
    pendingProposals: z.number(),
    approvalRate: z.number(),
    reputationScore: z.number(),
})

export const adminGameProposalsSchema: z.ZodMiniType<AdminGameProposalsType> = z.object({
    proposals: z.array(adminGameProposalSchema),
    pagination: paginationSchema,
    statusCounts: z.object({ pending: z.number(), approved: z.number(), rejected: z.number(), duplicate: z.number() }),
})
export const adminApprovalResponseSchema = z.object({
    success: z.boolean(),
    createdGameId: z.optional(z.number()),
})
export const adminSuccessResponseSchema = z.object({ success: z.boolean() })

const groupMemberSchema: z.ZodMiniType<GroupWithMembersAndGames['members'][number]> = z.object({
    ...publicUserSchema.shape,
    joinedAt: z.string(),
    games: z.array(gameCompleteSchema),
    reviews: z.array(gameReviewSchema),
})

const groupWithMembersAndGamesSchema: z.ZodMiniType<GroupWithMembersAndGames, unknown> = z.object({
    id: z.number(),
    name: z.string(),
    createdBy: z.number(),
    createdAt: z.string(),
    members: z.array(groupMemberSchema),
    // Older APIs do not send placeholders yet.
    placeholders: z._default(
        z.optional(
            z.array(z.object({ id: z.number(), displayName: z.string(), avatar: z.nullable(avatarSchema), gameIds: z.array(z.number()) })),
        ),
        [],
    ),
})

export const userGroupsSchema = z.array(groupWithMembersAndGamesSchema)

const groupPersonSchema = z.object({
    id: z.number(),
    groupId: z.number(),
    accountId: z.nullable(z.number()),
    kind: z.enum(['placeholder', 'linked']),
    status: z.enum(['active', 'archived']),
    displayName: z.string(),
    avatar: z.nullable(avatarSchema),
    standing: standingSchema,
    createdAt: z.string(),
    updatedAt: z.string(),
    claimedAt: z.nullable(z.string()),
})

const groupPersonOwnershipSchema = z.object({
    gameId: z.number(),
    status: z.enum(['asserted', 'rejected', 'disputed']),
    source: z.enum(['placeholder_setup', 'account_collection', 'claimed_import']),
    enteredByAccountId: z.number(),
    confirmedByAccountId: z.nullable(z.number()),
    createdAt: z.string(),
    updatedAt: z.string(),
})

const groupPersonPreferenceSchema = z.object({
    gameId: z.number(),
    preference: z.enum(['favorite', 'like', 'neutral', 'avoid']),
    source: z.enum(['placeholder_setup', 'claimed_import', 'account_profile']),
    enteredByAccountId: z.number(),
    createdAt: z.string(),
    updatedAt: z.string(),
})

export const groupPeopleSchema = z.object({
    people: z.array(
        z.object({
            person: groupPersonSchema,
            ownership: z.array(groupPersonOwnershipSchema),
            preferences: z.array(groupPersonPreferenceSchema),
            claimable: z._default(z.boolean(), false),
        }),
    ),
})

export const groupPersonSchemaResponse = groupPersonSchema

export const groupInvitationsSchema: z.ZodMiniType<Array<InvitationWithAccountsData>> = z.array(
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

export const clerkGroupInvitationSchema: z.ZodMiniType<ClerkGroupInvitationType> = z.object({
    invitationId: z.string().check(z.minLength(1)),
    emailAddress: z.email(),
    url: z.url(),
})

export const clerkGroupInvitationSummarySchema: z.ZodMiniType<ClerkGroupInvitationSummaryType> = z.object({
    invitationId: z.string().check(z.minLength(1)),
    emailAddress: z.email(),
    status: z.literal('pending'),
    createdAt: z.string(),
})

export const clerkGroupInvitationSummariesSchema = z.array(clerkGroupInvitationSummarySchema)

export const userInvitationsSchema: z.ZodMiniType<Array<InvitationWithExtraData>> = z.array(
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

const gameResultEntrySchema = z.object({
    accountId: z.nullable(z.number()),
    groupPersonId: z.nullable(z.number()),
    isWinner: z.boolean(),
    score: z.nullable(z.number()),
})

const meetFields = z.object({
    id: z.number(),
    groupId: z.number(),
    createdBy: z.number(),
    meetDate: z.string(),
    isConfirmed: z.boolean(),
    status: z.enum(['scheduled', 'active', 'completed', 'cancelled']),
    timezone: z.string(),
    notes: z.nullable(z.string()),
})

export const meetSchema: z.ZodMiniType<MeetType> = meetFields

const gameVotesSchema = z.object({ gameId: z.number(), accountIds: z.array(z.number()) })

const gameBringerSchema = z.object({ gameId: z.number(), accountId: z.nullable(z.number()), groupPersonId: z.nullable(z.number()) })

export const meetDetailsSchema: z.ZodMiniType<MeetWithAttendeesAndGamesType> = z.extend(meetFields, {
    attendees: z.array(z.number()),
    attendeeStatuses: z.array(
        z.object({
            accountId: z.number(),
            rsvpStatus: z.enum(['pending', 'accepted', 'declined']),
            attendanceStatus: z.enum(['unknown', 'attended', 'absent']),
        }) satisfies z.ZodMiniType<MeetAttendeeStatusType>,
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
    participants: z._default(z.optional(z.array(z.number())), []),
    participantStatuses: z._default(
        z.optional(
            z.array(
                z.object({
                    groupPersonId: z.number(),
                    rsvpStatus: z.enum(['pending', 'accepted', 'declined']),
                    attendanceStatus: z.enum(['unknown', 'attended', 'absent']),
                }),
            ),
        ),
        [],
    ),
    playedGamePersonParticipants: z._default(
        z.optional(
            z.array(
                z.object({
                    gameId: z.number(),
                    participantIds: z.array(z.number()),
                }),
            ),
        ),
        [],
    ),
    gameResults: z.optional(
        z.array(
            z.object({
                gameId: z.number(),
                results: z.array(gameResultEntrySchema),
            }),
        ),
    ),
    gameVotes: z._default(z.optional(z.array(gameVotesSchema)), []),
    gameBringers: z._default(z.optional(z.array(gameBringerSchema)), []),
})

const historyPersonSchema = z.object({
    id: z.number(),
    displayName: z.string(),
    avatar: z.nullable(avatarSchema),
    accountId: z.optional(z.nullable(z.number())),
    standing: standingSchema,
})

const historyUserSchema = z.object({ ...publicUserSchema.shape, standing: standingSchema })

const historyRecordSchema: z.ZodMiniType<HistoryRecordType> = z.object({
    meetData: meetFields,
    attendedBy: z.array(historyUserSchema),
    attendedByPeople: z.optional(z.array(historyPersonSchema)),
    gamesPlayed: z.array(
        z.object({
            gameData: gameCompleteSchema,
            playedBy: z.array(historyUserSchema),
            playedByPeople: z.optional(z.array(historyPersonSchema)),
            winnerAccountIds: z.optional(z.array(z.number())),
            winnerPersonIds: z.optional(z.array(z.number())),
        }),
    ),
})

export const userHistorySchema = z.array(historyRecordSchema)

export const userMeetsSchema: z.ZodMiniType<Array<AccountMeetType>> = z.array(
    z.extend(meetFields, {
        myRsvpStatus: z._default(z.optional(z.nullable(z.enum(['pending', 'accepted', 'declined']))), null),
        gamesToBring: z._default(z.optional(z.array(z.number())), []),
    }),
)

export const userStatsSchema: z.ZodMiniType<UserStatsType> = z.object({
    totalGamesValue: z.number(),
})

export const sessionRsvpUpdatedSchema: z.ZodMiniType<SessionRsvpUpdatedType> = z.object({
    sessionId: z.number(),
    rsvpStatus: z.enum(['pending', 'accepted', 'declined']),
})

export const sessionAttendanceUpdatedSchema: z.ZodMiniType<SessionAttendanceUpdatedType> = z.object({
    sessionId: z.number(),
    attendedIds: z.array(z.number()),
    attendedPersonIds: z.optional(z.array(z.number())),
})

export const userNotificationsSchema: z.ZodMiniType<Array<NotificationType>> = z.array(
    z.object({
        id: z.number(),
        accountId: z.number(),
        type: z.string(),
        message: z.string(),
        createdAt: z.string(),
        isRead: z.boolean(),
        data: z.optional(z.record(z.string(), z.unknown())),
    }),
)

export const sessionCreatedSchema: z.ZodMiniType<SessionCreatedType> = z.object({
    sessionId: z.number(),
    status: z.literal('completed'),
})

export const scheduledSessionCreatedSchema: z.ZodMiniType<ScheduledSessionCreatedType> = z.object({
    sessionId: z.number(),
    status: z.literal('scheduled'),
})

export const sessionStatusUpdatedSchema: z.ZodMiniType<SessionStatusUpdatedType> = z.object({
    sessionId: z.number(),
    status: z.enum(['scheduled', 'active', 'completed', 'cancelled']),
    sessionDate: z.string(),
})

export const sessionAttendeesUpdatedSchema: z.ZodMiniType<SessionAttendeesUpdatedType> = z.object({
    sessionId: z.number(),
    attendeeIds: z.array(z.number()),
    groupPersonIds: z.optional(z.array(z.number())),
})

export const sessionShortlistUpdatedSchema: z.ZodMiniType<SessionShortlistUpdatedType> = z.object({
    sessionId: z.number(),
    plannedGameIds: z.array(z.number()),
})

export const sessionGameProposedSchema: z.ZodMiniType<SessionGameProposedType> = z.object({
    sessionId: z.number(),
    plannedGameIds: z.array(z.number()),
    gameVotes: z.array(gameVotesSchema),
})

export const sessionGameBringersUpdatedSchema: z.ZodMiniType<SessionGameBringersUpdatedType> = z.object({
    sessionId: z.number(),
    gameBringers: z.array(gameBringerSchema),
})

export const sessionGameVotesUpdatedSchema: z.ZodMiniType<SessionGameVotesUpdatedType> = z.object({
    sessionId: z.number(),
    gameVotes: z.array(gameVotesSchema),
})

export const sessionPlayedGamesUpdatedSchema: z.ZodMiniType<SessionPlayedGamesUpdatedType> = z.object({
    sessionId: z.number(),
    playedGameIds: z.array(z.number()),
    skippedGameIds: z.array(z.number()),
    playedGameParticipants: z.array(
        z.object({
            gameId: z.number(),
            participantIds: z.array(z.number()),
        }),
    ),
    playedGamePersonParticipants: z.optional(
        z.array(
            z.object({
                gameId: z.number(),
                participantIds: z.array(z.number()),
            }),
        ),
    ),
})

export const recommendationsSchema: z.ZodMiniType<RecommendationsType> = z.object({
    groupId: z.number(),
    attendeeIds: z.array(z.number()),
    participantIds: z.optional(z.array(z.number())),
    availableMinutes: z.nullable(z.number()),
    decisionLens: z.enum(['balanced', 'fresh', 'favorite']),
    recommendations: z.array(
        z.object({
            gameData: gameCompleteSchema,
            score: z.number(),
            explanation: z.object({
                reasons: z.array(z.string()),
                attendeeOwnerCount: z.number(),
                attendeeCount: z.number(),
                averageReview: z.nullable(z.number()),
                lastPlayedAt: z.nullable(z.string()),
                interestedCount: z.number(),
                notForUsCount: z.number(),
            }),
        }),
    ),
    noResultReason: z.nullable(z.string()),
})

export const recommendationSignalsSchema: z.ZodMiniType<RecommendationSignalsType> = z.object({
    groupId: z.number(),
    signals: z.array(
        z.object({
            gameId: z.number(),
            interestedCount: z.number(),
            notForUsCount: z.number(),
            yourFeedback: z.nullable(z.enum(['interested', 'not_for_us'])),
            interestedBy: z.array(publicUserSchema),
            lastUpdatedAt: z.string(),
        }),
    ),
})

export const successSchema = z.object({ success: z.literal(true) })

const clerkFieldSyncSchema = z.enum(['unchanged', 'updated', 'taken'])
export const clerkSyncResultSchema: z.ZodMiniType<ClerkSyncResultType> = z.object({
    username: clerkFieldSyncSchema,
    email: clerkFieldSyncSchema,
})
export const createdGroupSchema: z.ZodMiniType<CreatedGroupType> = z.object({
    success: z.literal(true),
    groupId: z.int().check(z.positive()),
})

export const wishlistResponseSchema = z.object({ isWishlisted: z.boolean() })

export const gameResultsUpdatedSchema: z.ZodMiniType<GameResultsUpdatedType> = z.object({
    sessionId: z.number(),
    gameId: z.number(),
    results: z.array(gameResultEntrySchema),
})
