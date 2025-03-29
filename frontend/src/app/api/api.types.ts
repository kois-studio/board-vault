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

// #region Game

export type GameType = {
    id: number
    title: string
    imageUrl: string
    gameAvgDuration: number
    minPlayers: number
    maxPlayers: number
}

type SupportedLanguage = 'en'

export type GameCompleteType = GameType & {
    titleTranslations: Record<SupportedLanguage, string>
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
    playHistory: Array<{
        group: GroupType
        meet: MeetType
        playedBy: Array<UserType>
    }>
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
        UserType & {
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
    fromAccount: UserType
    group: GroupType
}

export type InvitationWithAccountsData = InvitationType & {
    fromAccount: UserType
    toAccount: UserType
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

// --------------------------------------------------------------------------
// #region play
// --------------------------------------------------------------------------
export type HistoryRecordType = {
    meetData: MeetType
    gamesPlayed: Array<{
        gameData: GameCompleteType
        playedBy: Array<UserType>
    }>
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
    gameData: GameType
}
