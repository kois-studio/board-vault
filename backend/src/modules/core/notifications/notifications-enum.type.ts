export enum NotificationTypeEnum {
    MEETING_SCHEDULED = 'meeting_scheduled',
    GAMES_ADDED = 'games_added',
    USER_JOINED_GROUP = 'user_joined_group',
    GAME_PROPOSAL_APPROVED = 'game_proposal_approved',
    GAME_PROPOSAL_REJECTED = 'game_proposal_rejected',
}

export type NotificationDataMap = {
    // {account} scheduled a {meeting} for {group}
    [NotificationTypeEnum.MEETING_SCHEDULED]: {
        account: number
        meeting: number
        group: number
    }
    // {account} from {group} added {games[]}
    [NotificationTypeEnum.GAMES_ADDED]: {
        account: number
        group: number
        games: number[]
    }
    // {account} joined/left {group}
    [NotificationTypeEnum.USER_JOINED_GROUP]: {
        account: number
        group: number
    }
    // Your game proposal "{gameTitle}" was approved
    [NotificationTypeEnum.GAME_PROPOSAL_APPROVED]: {
        gameTitle: string
        proposalId: number
        createdGameId?: number
    }
    // Your game proposal "{gameTitle}" was rejected: {reviewNotes}
    [NotificationTypeEnum.GAME_PROPOSAL_REJECTED]: {
        gameTitle: string
        proposalId: number
        reviewNotes: string
    }
}
