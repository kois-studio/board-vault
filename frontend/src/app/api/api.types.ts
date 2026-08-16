// wrapper type - unused
type ResponseDto<T> = {
    statusOk: boolean
    message: string
    code: number
    data: T
}

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
    isDeleted: boolean
    isAdmin: boolean
    email_verified: boolean
}

export type PublicUserType = Pick<UserType, 'id' | 'username' | 'displayName' | 'avatar'>

// #region Game

export type GameType = {
    id: number
    title: string
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

export type GroupWithMembersAndGames = GroupType & {
    members: Array<
        PublicUserType & {
            joinedAt: string
            games: Array<GameCompleteType>
            reviews: Array<GameReviewDto>
        }
    >
}

// #region Invitation

export type InvitationType = {
    id: number
    groupId: number
    fromAccountId: number
    toAccountId: number
    sentAt: string
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
}

export type MeetAttendeeType = {
    meetId: number
    accountId: number
}

export type MeetGameType = {
    meetId: number
    gameId: number
}

export type MeetWithAttendeesAndGamesType = MeetType & {
    attendees: Array<UserType['id']>
    playedGames: Array<GameType['id']>
    plannedGames: Array<GameType['id']>
}

export type CreatePlaySessionRequest = {
    groupId: number
    sessionDate: string
    timezone: string
    attendeeIds: Array<number>
    games: Array<{
        gameId: number
        participantIds: Array<number>
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
    plannedGameIds: Array<number>
}

export type ScheduledSessionCreatedType = {
    sessionId: number
    status: 'scheduled'
}

export type UpdateSessionStatusRequest = {
    status: 'active' | 'completed' | 'cancelled'
}

export type SessionStatusUpdatedType = {
    sessionId: number
    status: MeetType['status']
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

export type BrowseGamesResultType = {
    games: Array<GameCompleteType>
    pagination: {
        currentPage: number
        totalPages: number
        totalItems: number
        itemsPerPage: number
    }
}

export type AdminGamesResultType = {
    games: Array<GameWithTagsAndTranslationsType>
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
export type HistoryRecordType = {
    meetData: MeetType
    gamesPlayed: Array<{
        gameData: GameCompleteType
        playedBy: Array<PublicUserType>
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
    }
}

export type RecommendationsType = {
    groupId: number
    attendeeIds: Array<number>
    availableMinutes: number | null
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
}

export type CreateGameProposalType = {
    title: string
    imageUrl?: string
    gameAvgDuration?: number
    minPlayers?: number
    maxPlayers?: number
    proposedTags?: string
    notes?: string
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
