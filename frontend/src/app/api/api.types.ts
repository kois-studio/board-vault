// #region User

export type UserType = {
    id: number
    email: string
    username: string
    displayName: string
    avatar: {
        backgroundColor: string
        iconName: string | null
        emoji: string | null
        type: 'icon' | 'emoji' | 'initials'
        initials: string
    }
    createdAt: string
}

export type PublicUserType = Pick<UserType, 'id' | 'username' | 'displayName' | 'avatar'>

// #region Game

export type GameType = {
    id: number
    title?: string
    imageUrl: string
    gameAvgDuration: number
    minPlayers: number
    maxPlayers: number
}

type SupportedLanguage = 'en' | 'es'

export type GameCompleteType = GameType & {
    titleTranslations: Record<SupportedLanguage, string>
}

export type GameWithTagsAndTranslationsType = GameType & {
    translations: Record<SupportedLanguage, string>
    tags: Array<{
        id: number
        name: string
        categoryName: string
    }>
}

export type GameViewType = {
    gameData: GameCompleteType
    ownedGameData: null | {
        purchaseDate: string | null
        purchasePrice: number | null
        purchaseNotes: string | null
    }
    tags: Array<{
        tag: string
        category: string
    }>
    wishlistedGameData: null | {
        dateAdded: string
        notes: string
    }
    ratingData: {
        userRating: null | number
        avgGroupsRating: null | { review: number; count: number }
        avgGlobalRating: null | { review: number; count: number }
    }
    similarGames: Array<GameCompleteType>
}

// #region GameOwned
export type GameOwnedType = {
    accountId: number
    gameId: number
    purchaseDate: string | null
    purchasePrice: number | null
    purchaseNotes: string | null
}

export type UpdateGameOwnedType = {
    purchaseDate?: string | null
    purchasePrice?: number | null
    purchaseNotes?: string | null
}

// #region Group
export type GroupType = {
    id: number
    name: string
    createdBy: number
    createdAt: string
}

export type CreatedGroupType = {
    success: true
    groupId: number
}

export type GroupWithMembersAndGames = GroupType & {
    members: Array<
        PublicUserType & {
            joinedAt: string
            games: Array<GameCompleteType>
            reviews: Array<GameReviewDto>
        }
    >
    /** People in the group without an account (group-scoped placeholders). */
    placeholders: Array<{ id: number; displayName: string; avatar: PublicUserType['avatar'] | null; gameIds: Array<number> }>
}

/** Where someone stands in a group (ADR-0018): history keeps people who left or deleted their account. */
export type GroupStanding = 'member' | 'left' | 'deleted'

export type GroupPersonType = {
    id: number
    groupId: number
    accountId: number | null
    kind: 'placeholder' | 'linked'
    status: 'active' | 'archived'
    displayName: string
    avatar: PublicUserType['avatar'] | null
    /** Absent from older API responses: a member. */
    standing?: GroupStanding
    createdAt: string
    updatedAt: string
    claimedAt: string | null
}

export type GroupPersonOwnershipType = {
    gameId: number
    status: 'asserted' | 'rejected' | 'disputed'
    source: 'placeholder_setup' | 'account_collection' | 'claimed_import'
    enteredByAccountId: number
    confirmedByAccountId: number | null
    createdAt: string
    updatedAt: string
}

export type GroupPersonPreferenceType = {
    gameId: number
    preference: 'favorite' | 'like' | 'neutral' | 'avoid'
    source: 'placeholder_setup' | 'claimed_import' | 'account_profile'
    enteredByAccountId: number
    createdAt: string
    updatedAt: string
}

export type GroupPersonWorkspaceType = {
    person: GroupPersonType
    ownership: Array<GroupPersonOwnershipType>
    preferences: Array<GroupPersonPreferenceType>
    claimable: boolean
}

/** One person in a group's standings; a group person linked to an account counts as that account. */
export type GroupStandingType = {
    accountId: number | null
    groupPersonId: number | null
    displayName: string
    avatar: PublicUserType['avatar'] | null
    sessions: number
    gamesPlayed: number
    wins: number
}

export type GroupInsightsType = {
    sessions: number
    gamesPlayed: number
    gamesWithWinner: number
    standings: Array<GroupStandingType>
    mostPlayed: Array<{ gameData: GameCompleteType; sessions: number; lastPlayedAt: string }>
    neverPlayed: Array<GameCompleteType>
    neverPlayedCount: number
}

/** One person's games in a group and their approximate worth at retail price, in whole euros. */
export type GroupCollectionPersonType = {
    accountId: number | null
    groupPersonId: number | null
    displayName: string
    avatar: PublicUserType['avatar'] | null
    games: Array<GameCompleteType>
    worth: number
    pricedGames: number
}

/** The group's games and their approximate worth (ADR-0016): retail prices, never what anyone paid. */
export type GroupCollectionType = {
    worth: number
    copies: number
    pricedCopies: number
    people: Array<GroupCollectionPersonType>
}

export type GroupAcquisitionEntryType = {
    gameData: GameCompleteType
    interestedBy: Array<PublicUserType>
    interestCount: number
    ownerCount: number
    firstInterestedAt: string
    decisionStatus: 'open' | 'planned' | 'not_now'
    decisionAt: string | null
    decisionBy: PublicUserType | null
}

export type ClerkGroupInvitationType = {
    invitationId: string
    emailAddress: string
    url: string
}

export type ClerkGroupInvitationSummaryType = {
    invitationId: string
    emailAddress: string
    status: 'pending'
    createdAt: string
}

// #region Invitation

export type InvitationType = {
    id: number
    groupId: number
    fromAccountId: number
    toAccountId: number
    sentAt: string
    expiresAt: string
}

export type InvitationWithExtraData = InvitationType & {
    fromAccount: PublicUserType
    group: GroupType
}

export type InvitationWithAccountsData = InvitationType & {
    fromAccount: PublicUserType
    toAccount: PublicUserType
}

// #region Notification

export type NotificationType = {
    id: number
    accountId: number
    type: string
    message: string
    createdAt: string
    isRead: boolean
    data?: Record<string, unknown>
}

export const NotificationTypeEnum = {
    InvitationAccepted: 'invitation_accepted',
}

// #region GameReview

export type GameReviewType = {
    accountId: number
    gameId: number
    review: number
    reviewDate: string
}

// #region Meeting

export type MeetType = {
    id: number
    groupId: number
    createdBy: number
    meetDate: string
    isConfirmed: boolean
    status: 'scheduled' | 'active' | 'completed' | 'cancelled'
    timezone: string
    notes: string | null
}

export type MeetAttendeeStatusType = {
    accountId: number
    rsvpStatus: 'pending' | 'accepted' | 'declined'
    attendanceStatus: 'unknown' | 'attended' | 'absent'
}

export type MeetPlayedGameParticipantsType = {
    gameId: number
    participantIds: Array<number>
}

export type MeetPersonAttendeeStatusType = {
    groupPersonId: number
    rsvpStatus: 'pending' | 'accepted' | 'declined'
    attendanceStatus: 'unknown' | 'attended' | 'absent'
}

export type MeetWithAttendeesAndGamesType = MeetType & {
    attendees: Array<UserType['id']>
    attendeeStatuses: Array<MeetAttendeeStatusType>
    playedGames: Array<GameType['id']>
    plannedGames: Array<GameType['id']>
    skippedGames: Array<GameType['id']>
    playedGameParticipants: Array<MeetPlayedGameParticipantsType>
    participants?: Array<number>
    participantStatuses?: Array<MeetPersonAttendeeStatusType>
    playedGamePersonParticipants?: Array<MeetPlayedGameParticipantsType>
    /** Missing from servers older than results. */
    gameResults?: Array<MeetGameResultsType>
}

/** One participant's result in a played game: an account or a group person, never both. */
export type GameResultEntryType = {
    accountId: number | null
    groupPersonId: number | null
    isWinner: boolean
    score: number | null
}

export type MeetGameResultsType = {
    gameId: number
    results: Array<GameResultEntryType>
}

export type UpdateGameResultsRequest = {
    results: Array<{ accountId?: number; groupPersonId?: number; isWinner: boolean; score?: number | null }>
}

export type GameResultsUpdatedType = {
    sessionId: number
    gameId: number
    results: Array<GameResultEntryType>
}

export type CreatePlaySessionRequest = {
    groupId: number
    sessionDate: string
    timezone: string
    notes?: string
    attendeeIds?: Array<number>
    groupPersonIds?: Array<number>
    games: Array<{
        gameId: number
        participantIds?: Array<number>
        participantPersonIds?: Array<number>
    }>
}

export type SessionCreatedType = {
    sessionId: number
    status: 'completed'
}

export type ScheduleSessionRequest = {
    groupId: number
    sessionDate: string
    timezone: string
    notes?: string
    attendeeIds?: Array<number>
    groupPersonIds?: Array<number>
    plannedGameIds: Array<number>
}

export type ScheduledSessionCreatedType = {
    sessionId: number
    status: 'scheduled'
}

export type UpdateSessionStatusRequest = {
    status: 'active' | 'completed' | 'cancelled'
    /** Finishing with no game marked as played needs this: the organizer confirmed nothing was played. */
    noGamesPlayed?: boolean
}

export type UpdateSessionAttendeesRequest = {
    attendeeIds?: Array<number>
    groupPersonIds?: Array<number>
}

export type SessionStatusUpdatedType = {
    sessionId: number
    status: MeetType['status']
    /** Moved to now when a night is started or finished before its date. */
    sessionDate: string
}

export type SessionAttendeesUpdatedType = {
    sessionId: number
    attendeeIds: Array<number>
    groupPersonIds?: Array<number>
}

export type UpdateSessionShortlistRequest = {
    plannedGameIds: Array<number>
}

export type SessionShortlistUpdatedType = {
    sessionId: number
    plannedGameIds: Array<number>
}

export type UpdateSessionPlayedGamesRequest = {
    playedGameIds: Array<number>
    games: Array<{
        gameId: number
        participantIds?: Array<number>
        participantPersonIds?: Array<number>
    }>
}

export type SessionPlayedGamesUpdatedType = {
    sessionId: number
    playedGameIds: Array<number>
    skippedGameIds: Array<number>
    playedGameParticipants: Array<MeetPlayedGameParticipantsType>
    playedGamePersonParticipants?: Array<MeetPlayedGameParticipantsType>
}

export type UpdateSessionRsvpRequest = {
    rsvpStatus: 'accepted' | 'declined'
}

export type SessionRsvpUpdatedType = {
    sessionId: number
    rsvpStatus: 'pending' | 'accepted' | 'declined'
}

export type UpdateSessionAttendanceRequest = {
    attendedIds?: Array<number>
    attendedPersonIds?: Array<number>
}

export type SessionAttendanceUpdatedType = {
    sessionId: number
    attendedIds: Array<number>
    attendedPersonIds?: Array<number>
}

export type UserStatsType = {
    totalGamesValue: number
}

// --------------------------------------------------------------------------
// #region collection
// --------------------------------------------------------------------------
export type GameReviewDto = {
    accountId: number
    gameId: number
    review: number
    reviewDate: string
}

export type GameReviewWithGameData = GameReviewDto & {
    gameData: GameCompleteType
}

export type GameLength = 'short' | 'medium' | 'long' | 'epic'
export type BrowseSort = 'title' | 'shortest' | 'newest'

/** Browse filters; they live in the page URL. */
export type BrowseFilters = {
    players: number | null
    length: GameLength | null
    tags: Array<number>
    hideOwned: boolean
    sort: BrowseSort
}

/** A tag that at least one catalogue game has. */
export type CatalogueTagType = {
    id: number
    name: string
    categoryName: string
    gameCount: number
}

export type BrowseGamesResultType = {
    games: Array<GameCompleteType>
    pagination: {
        currentPage: number
        totalPages: number
        totalItems: number
        itemsPerPage: number
    }
}

/** A catalogue data problem, as the admin Games filter names it. */
export type CatalogueIssue = 'no-title' | 'no-artwork' | 'no-spanish' | 'no-tags' | 'no-price'

export type AdminGameType = GameWithTagsAndTranslationsType & {
    /** The English title. */
    title: string
    issues: Array<CatalogueIssue>
    /** Where the stored artwork was copied from; null for an upload or no artwork. */
    artworkSource: string | null
    /** Recommended retail price in euros; null when unknown. */
    retailPrice: number | null
}

export type AdminGamesFilters = {
    search?: string
    players?: number
    length?: GameLength
    tagIds?: Array<number>
    issue?: CatalogueIssue
}

export type AdminRankedGameType = { gameId: number; title: string; count: number }

/** What needs doing and the catalogue at a glance. */
export type AdminOverviewType = {
    proposals: { pending: number; oldestPendingAt: string | null }
    catalogueIssues: Record<CatalogueIssue, number>
    tags: { unused: number; emptyCategories: number }
    catalogue: {
        games: number
        approvedLast30Days: number
        mostOwned: Array<AdminRankedGameType>
        mostWantedUnowned: Array<AdminRankedGameType>
    }
    recentDecisions: Array<{
        proposalId: number
        title: string
        status: 'approved' | 'rejected' | 'duplicate'
        reviewedAt: string
        reviewerName: string | null
        createdGameId: number | null
    }>
}

/** The fields sent are saved together; an empty Spanish title removes it. */
export type UpdateAdminGameType = {
    translations?: Partial<Record<SupportedLanguage, string>>
    imageUrl?: string
    minPlayers?: number
    maxPlayers?: number
    gameAvgDuration?: number
    /** Euros; null removes the price. */
    retailPrice?: number | null
    tagIds?: Array<number>
}

export type AdminGamesResultType = {
    games: Array<AdminGameType>
    pagination: {
        currentPage: number
        totalPages: number
        totalItems: number
        itemsPerPage: number
    }
}

// --------------------------------------------------------------------------
// #region play
// --------------------------------------------------------------------------
export type HistoryPersonType = {
    id: number
    displayName: string
    avatar: PublicUserType['avatar'] | null
    accountId?: number | null
    standing?: GroupStanding
}

export type HistoryUserType = PublicUserType & { standing?: GroupStanding }

export type HistoryRecordType = {
    meetData: MeetType
    attendedBy: Array<HistoryUserType>
    attendedByPeople?: Array<HistoryPersonType>
    gamesPlayed: Array<{
        gameData: GameCompleteType
        playedBy: Array<HistoryUserType>
        playedByPeople?: Array<HistoryPersonType>
        winnerAccountIds?: Array<number>
        winnerPersonIds?: Array<number>
    }>
}

export type RecommendationType = {
    gameData: GameCompleteType
    score: number
    explanation: {
        reasons: Array<string>
        attendeeOwnerCount: number
        attendeeCount: number
        averageReview: number | null
        lastPlayedAt: string | null
        interestedCount: number
        notForUsCount: number
    }
}

export type RecommendationSignalType = {
    gameId: number
    interestedCount: number
    notForUsCount: number
    yourFeedback: 'interested' | 'not_for_us' | null
    interestedBy: Array<PublicUserType>
    lastUpdatedAt: string
}

export type RecommendationSignalsType = {
    groupId: number
    signals: Array<RecommendationSignalType>
}

export type RecommendationsType = {
    groupId: number
    attendeeIds: Array<number>
    participantIds?: Array<number>
    availableMinutes: number | null
    decisionLens: 'balanced' | 'fresh' | 'favorite'
    recommendations: Array<RecommendationType>
    noResultReason: string | null
}

// --------------------------------------------------------------------------
// #region collection activity
// --------------------------------------------------------------------------
export type CollectionActivityType = {
    id: number
    accountId: number
    gameId: number
    actionType: 'added' | 'rated' | 'wishlisted' | 'unwishlisted' | 'updated' | 'removed'
    actionDetails: null | { rating: null | number }
    createdAt: string
}

export type CollectionActivityWithGameDataType = CollectionActivityType & {
    gameData: GameCompleteType
}

// --------------------------------------------------------------------------
// #region admin
// --------------------------------------------------------------------------
export type TagCategoryType = {
    id: number
    name: string
    tags: Array<TagType['id']>
    gameCount: number
}

export type TagType = {
    id: number
    name: string
    categoryId: TagCategoryType['id']
    gameCount: number
}

// #region Game Proposal

export type GameProposalType = {
    id: number
    submittedBy: number
    status: 'pending' | 'approved' | 'rejected' | 'duplicate'
    title: string
    imageUrl: string | null
    gameAvgDuration: number | null
    minPlayers: number | null
    maxPlayers: number | null
    proposedTags: string | null
    notes: string | null
    reviewedBy: number | null
    reviewedAt: string | null
    reviewNotes: string | null
    createdGameId: number | null
    submittedAt: string
    /** Where the approved game goes for the proposer; missing from older servers. */
    addTo?: 'shelf' | 'wishlist' | null
}

export type CreateGameProposalType = {
    title: string
    imageUrl?: string
    gameAvgDuration?: number
    minPlayers?: number
    maxPlayers?: number
    proposedTags?: string
    notes?: string
    addTo?: 'shelf' | 'wishlist'
}

export type ProposalStatus = GameProposalType['status']

export type AdminGameProposalType = GameProposalType & { submitterId: number; reviewerId?: number }

export type AdminGameProposalsType = {
    proposals: Array<AdminGameProposalType>
    pagination: {
        currentPage: number
        totalPages: number
        totalItems: number
        itemsPerPage: number
    }
    /** How many proposals have each status, for the filter tabs. */
    statusCounts: Record<ProposalStatus, number>
}

/** What an admin approves: every field overrides the proposal; players and length are required when it has none. */
export type ApproveGameProposalType = {
    reviewNotes?: string
    imageUrl?: string
    retailPrice?: number
    gameAvgDuration?: number
    minPlayers?: number
    maxPlayers?: number
    translations?: Partial<Record<SupportedLanguage, string>>
    tagIds?: number[]
}

export type UserProposalStatsType = {
    totalProposals: number
    approvedProposals: number
    rejectedProposals: number
    duplicateProposals: number
    pendingProposals: number
    approvalRate: number
    reputationScore: number
}
