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

export type GameViewType = {
    gameData: GameType
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
        userRating: number
        avgGroupsRating: number
        avgPlayersRating: number
    }
    playHistory: Array<MeetType>
    similarGames: Array<GameType>
}

// #region Group

export type GameReviewDto = {
    accountId: number
    gameId: number
    review: number
    reviewDate: string
}

export type GroupWithMembersAndGames = {
    id: number
    name: string
    createdBy: number
    createdAt: string
    members: Array<
        UserType & {
            joinedAt: string
            games: Array<GameType>
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
    status: string // enum: ['pending', 'accepted', 'rejected']
    sentAt: string
}

export type InvitationWithExtraData = InvitationType & {
    fromAccount: UserType
    group: GroupWithMembersAndGames
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
    gameData: GameType
}

// #region GamePlaySession

export type GamePlayHistoryType = {
    accountId: number
    gameData: GameType
    meetData: MeetType
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
