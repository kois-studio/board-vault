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
    display_name: string
    imageUrl: string
    createdAt: string
    is_deleted: boolean
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

// #region Meeting

export type MeetType = {
    id: number
    groupId: number
    createdBy: number
    createdAt: string
    isConfirmed: boolean
    confirmedAt: string | null
}

export type MeetAttendeeType = {
    meetId: number
    accountId: number
    isAttending: boolean
}

export type MeetGameType = {
    meetId: number
    gameId: number
    isPlayed: boolean
}

export type MeetWithAttendeesAndGamesType = MeetType & {
    attendees: Array<UserType['id']>
    playedGames: Array<GameType['id']>
}
