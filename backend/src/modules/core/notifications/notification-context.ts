import type { NotificationContextDto, NotificationDto } from '../../../common/types/notification.type.js'

/** The ids a notification's `data` points at, by kind. */
export type NotificationRefs = {
    accounts: Array<number>
    groups: Array<number>
    sessions: Array<number>
    people: Array<number>
    games: Array<number>
}

const ids = (...values: Array<unknown>): Array<number> =>
    values.flatMap(value => (Array.isArray(value) ? value : [value])).filter((value): value is number => Number.isInteger(value))

/**
 * What a notification refers to (NotificationDataMap): who acted (`account`), who left (`member`),
 * who proposed a game (`submittedBy`), the group, the game night (`meeting`), the group person, and
 * the games (`game`, a shelf change's `added` and `removed`).
 */
export function notificationRefs(notification: Pick<NotificationDto, 'data'>): NotificationRefs {
    const data = notification.data as Record<string, unknown>

    return {
        accounts: ids(data.account, data.member, data.submittedBy),
        groups: ids(data.group),
        sessions: ids(data.meeting),
        people: ids(data.person),
        games: ids(data.game, data.added, data.removed),
    }
}

/** Every id of each kind across an inbox, once, so each kind is read in one query. */
export function mergeRefs(all: Array<NotificationRefs>): NotificationRefs {
    const unique = (pick: (refs: NotificationRefs) => Array<number>) => [...new Set(all.flatMap(pick))]

    return {
        accounts: unique(refs => refs.accounts),
        groups: unique(refs => refs.groups),
        sessions: unique(refs => refs.sessions),
        people: unique(refs => refs.people),
        games: unique(refs => refs.games),
    }
}

/** The part of what was read that one notification refers to. */
export function contextFor(refs: NotificationRefs, found: NotificationContextDto): NotificationContextDto {
    const pick = <T extends { id: number }>(items: Array<T>, wanted: Array<number>) => items.filter(item => wanted.includes(item.id))

    return {
        accounts: pick(found.accounts, refs.accounts),
        groups: pick(found.groups, refs.groups),
        sessions: pick(found.sessions, refs.sessions),
        people: pick(found.people, refs.people),
        games: pick(found.games, refs.games),
    }
}
