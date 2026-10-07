import type { GroupStanding, HistoryPersonType, HistoryUserType, PublicUserType } from '../../api/api.types'

export type HistoryPerson = HistoryPersonType

/**
 * The name history shows for someone (ADR-0018): "Mario (left)" once they left the group.
 * A deleted account already carries the name "Deleted account".
 */
export function nameWithStanding(name: string, standing: GroupStanding | undefined): string {
    return standing === 'left' ? `${name} (left)` : name
}

/** The words a tooltip or screen reader adds for someone no longer in the group, or empty. */
export function standingNote(standing: GroupStanding | undefined): string {
    if (standing === 'left') return 'Left the group'
    if (standing === 'deleted') return 'Deleted their account'
    return ''
}

export type HistoryParticipant = {
    /** Stable across sessions: the account for anyone with one, otherwise the group person. */
    key: string
    accountId: number | null
    personId: number | null
    /** With "(left)" for someone who left the group. */
    displayName: string
    username: string
    avatar: PublicUserType['avatar'] | null
    standing: GroupStanding
}

/**
 * Lists everyone who attended or played, once.
 *
 * Sessions recorded with accounts list people in `attendedBy`/`playedBy`, sessions recorded
 * with group people list them in `attendedByPeople`/`playedByPeople`, and older sessions list
 * the same people in both. Group people come first, under the group's names; an account is
 * added only when no listed group person is linked to it. Everyone recorded is listed, also
 * people who left the group or deleted their account (ADR-0018).
 */
export function mergeHistoryParticipants(accounts: Array<HistoryUserType>, people: Array<HistoryPerson> = []): Array<HistoryParticipant> {
    const accountsById = new Map(accounts.map((account) => [account.id, account]))
    const linkedAccountIds = new Set(people.map((person) => person.accountId).filter((id): id is number => id !== null && id !== undefined))
    // An API without `accountId` cannot say which accounts the people cover; its group people
    // already include every member, so they alone are the attendees.
    const legacyPeoplePayload = people.length > 0 && people.every((person) => person.accountId === undefined)

    const fromPeople = people.map((person): HistoryParticipant => {
        const accountId = person.accountId ?? null
        const account = accountId === null ? undefined : accountsById.get(accountId)
        const standing = person.standing ?? 'member'
        return {
            key: accountId === null ? `person:${person.id}` : `account:${accountId}`,
            accountId,
            personId: person.id,
            displayName: nameWithStanding(person.displayName, standing),
            username: account?.username ?? person.displayName,
            avatar: person.avatar ?? account?.avatar ?? null,
            standing,
        }
    })
    const fromAccounts = (legacyPeoplePayload ? [] : accounts)
        .filter((account) => !linkedAccountIds.has(account.id))
        .map(
            (account): HistoryParticipant => ({
                key: `account:${account.id}`,
                accountId: account.id,
                personId: null,
                displayName: nameWithStanding(account.displayName || account.username, account.standing),
                username: account.username,
                avatar: account.avatar,
                standing: account.standing ?? 'member',
            }),
        )

    return [...fromPeople, ...fromAccounts]
}

/** The players of a history game who won it, as names; a player matches by group person or by account. */
export function historyWinnerNames(game: {
    playedBy: Array<HistoryUserType>
    playedByPeople?: Array<HistoryPerson>
    winnerAccountIds?: Array<number>
    winnerPersonIds?: Array<number>
}): Array<string> {
    const accounts = new Set(game.winnerAccountIds ?? [])
    const people = new Set(game.winnerPersonIds ?? [])
    if (accounts.size === 0 && people.size === 0) return []
    return mergeHistoryParticipants(game.playedBy, game.playedByPeople)
        .filter(
            (player) =>
                (player.personId !== null && people.has(player.personId)) || (player.accountId !== null && accounts.has(player.accountId)),
        )
        .map((player) => player.displayName)
}

/** "Ana won", "Ana and Bo won", "Ana, Bo and Cy won"; empty without winners. */
export function formatWinners(names: Array<string>): string {
    if (names.length === 0) return ''
    if (names.length === 1) return `${names[0]} won`
    return `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]} won`
}
