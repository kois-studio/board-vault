export enum NotificationTypeEnum {
    MEETING_SCHEDULED = 'meeting_scheduled',
    GAMES_ADDED = 'games_added',
    USER_JOINED_GROUP = 'user_joined_group',
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
    // {account} joined {group}
    [NotificationTypeEnum.USER_JOINED_GROUP]: {
        account: number
        group: number
    }
}
