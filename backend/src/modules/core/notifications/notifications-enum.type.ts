export enum NotificationTypeEnum {
    MEETING_SCHEDULED = 'meeting_scheduled',
    SESSION_STARTED = 'session_started',
    SESSION_FINISHED = 'session_finished',
    SESSION_CANCELLED = 'session_cancelled',
    SHELF_CHANGED = 'shelf_changed',
    USER_JOINED_GROUP = 'user_joined_group',
    USER_LEFT_GROUP = 'user_left_group',
    GROUP_PERSON_CHANGED = 'group_person_changed',
    GAME_PROPOSAL_APPROVED = 'game_proposal_approved',
    GAME_PROPOSAL_REJECTED = 'game_proposal_rejected',
    GAME_PROPOSAL_SUBMITTED = 'game_proposal_submitted',
    GAME_PROPOSAL_DUPLICATE = 'game_proposal_duplicate',
}

type SessionNotificationData = {
    account: number
    meeting: number
    group: number
}

export type ShelfNotificationData = {
    account: number
    group: number
    added: number[]
    removed: number[]
}

export type NotificationDataMap = {
    // {account} scheduled a {meeting} for {group}
    [NotificationTypeEnum.MEETING_SCHEDULED]: {
        account: number
        meeting: number
        group: number
    }
    // {account} started / finished / cancelled the {meeting} of {group}
    [NotificationTypeEnum.SESSION_STARTED]: SessionNotificationData
    [NotificationTypeEnum.SESSION_FINISHED]: SessionNotificationData
    [NotificationTypeEnum.SESSION_CANCELLED]: SessionNotificationData
    // {account} added {added[]} to and removed {removed[]} from their shelf, since you last read it.
    // One unread notification per person whose shelf changed, kept up to date (ShelfNotifications).
    // {group} is a group you share with them, where their games are shown.
    [NotificationTypeEnum.SHELF_CHANGED]: ShelfNotificationData
    // {account} joined {group}
    [NotificationTypeEnum.USER_JOINED_GROUP]: {
        account: number
        group: number
    }
    // {member} left {group}, or {account} (its owner) removed them from it
    [NotificationTypeEnum.USER_LEFT_GROUP]: {
        account: number
        group: number
        member: number
    }
    // {account} changed a game or preference you entered for {person} in {group} (ADR-0020)
    [NotificationTypeEnum.GROUP_PERSON_CHANGED]: {
        account: number
        group: number
        person: number
        game: number
    }
    // Your game proposal "{gameTitle}" was approved
    [NotificationTypeEnum.GAME_PROPOSAL_APPROVED]: {
        gameTitle: string
        proposalId: number
        createdGameId?: number
    }
    // New game proposal "{gameTitle}" from {submittedBy}, sent to every admin
    [NotificationTypeEnum.GAME_PROPOSAL_SUBMITTED]: {
        gameTitle: string
        proposalId: number
        submittedBy: number
    }
    // Your game proposal "{gameTitle}" was rejected: {reviewNotes}
    [NotificationTypeEnum.GAME_PROPOSAL_REJECTED]: {
        gameTitle: string
        proposalId: number
        reviewNotes: string
    }
    // Your game proposal "{gameTitle}" is already in Board Vault as "{duplicateOfTitle}"
    [NotificationTypeEnum.GAME_PROPOSAL_DUPLICATE]: {
        gameTitle: string
        proposalId: number
        duplicateOfGameId: number
        duplicateOfTitle: string
    }
}
