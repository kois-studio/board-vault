import type { NotificationContextType, NotificationType } from '../../api/api.types'
import { formatDateTime, intlLocale } from './format'

/**
 * A notification in the page's language (ADR-0024), worded from its `type`, `data`, and the
 * `context` the inbox sends with it. Without what a sentence needs (an older API, something since
 * deleted, a type this app does not know) it shows the English `message` the API stored.
 */
export function notificationText(notification: NotificationType): string {
    return (notification.context && wordNotification(notification, notification.context)) || notification.message
}

/** How many titles a sentence names before it counts the rest (as the API's English does). */
const NAMED_TITLES = 2

function wordNotification(notification: NotificationType, context: NotificationContextType): string | null {
    const data = notification.data ?? {}
    const account = (id: unknown) => {
        const found = context.accounts.find((item) => item.id === id)
        if (!found) return null
        return found.deleted || !found.name ? $localize`:A person whose account was deleted:Deleted account` : found.name
    }
    const group = context.groups.find((item) => item.id === data['group'])?.name ?? null
    const person = context.people.find((item) => item.id === data['person'])?.name ?? null
    const session = context.sessions.find((item) => item.id === data['meeting'])
    const when = session
        ? formatDateTime(
              new Date(session.date),
              { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' },
              session.timezone,
          )
        : null
    const titles = new Map(context.games.map((game) => [game.id, game.title]))
    const actor = account(data['account'])

    switch (notification.type) {
        case 'meeting_scheduled':
            return actor && group && when
                ? $localize`${actor}:person: planned a game night in ${group}:group: for ${when}:date:. Can you make it?`
                : null
        case 'session_started':
            return actor && group ? $localize`${actor}:person: started the ${group}:group: game night. Mark what you play as you go.` : null
        case 'session_finished':
            return group && when ? $localize`The ${group}:group: game night of ${when}:date: is finished. Rate what you played.` : null
        case 'session_cancelled':
            return actor && group && when ? $localize`${actor}:person: cancelled the ${group}:group: game night of ${when}:date:.` : null
        case 'user_joined_group':
            return actor && group ? $localize`${actor}:person: joined ${group}:group:.` : null
        case 'user_left_group': {
            const member = account(data['member'])
            if (!member || !group) return null
            return data['member'] === data['account']
                ? $localize`${member}:person: left ${group}:group:.`
                : actor && $localize`${actor}:remover: removed ${member}:removedPerson: from ${group}:group:.`
        }
        case 'shelf_changed':
            return actor ? shelfChange(actor, data, titles) : null
        case 'group_person_changed': {
            const game = titles.get(data['game'] as number) ?? null
            if (!actor || !person || !game || !group) return null
            return groupPersonChange(String(data['change'] ?? ''), actor, person, game, group)
        }
        case 'game_proposal_approved':
            return typeof data['gameTitle'] === 'string' ? $localize`Your game proposal "${data['gameTitle']}:title:" was approved!` : null
        case 'game_proposal_submitted':
            return typeof data['gameTitle'] === 'string' ? $localize`New game proposal: "${data['gameTitle']}:title:"` : null
        case 'game_proposal_rejected':
            return typeof data['gameTitle'] === 'string' && typeof data['reviewNotes'] === 'string'
                ? $localize`Your game proposal "${data['gameTitle']}:title:" was rejected: ${data['reviewNotes']}:reason:`
                : null
        case 'game_proposal_duplicate': {
            if (typeof data['gameTitle'] !== 'string' || typeof data['duplicateOfTitle'] !== 'string') return null
            const sentence = $localize`Your game proposal "${data['gameTitle']}:title:" is already in Board Vault as "${data['duplicateOfTitle']}:existingTitle:".`
            return typeof data['reviewNotes'] === 'string' && data['reviewNotes'] ? `${sentence} ${data['reviewNotes']}` : sentence
        }
        default:
            return null
    }
}

function groupPersonChange(change: string, actor: string, person: string, game: string, group: string): string | null {
    switch (change) {
        case 'owned':
            return $localize`${actor}:person: said ${person}:groupPerson: has ${game}:game:, in ${group}:group:.`
        case 'not_owned':
            return $localize`${actor}:person: removed ${game}:game: from ${person}:groupPerson:'s games in ${group}:group:.`
        case 'unsure':
            return $localize`${actor}:person: marked ${game}:game: as unsure for ${person}:groupPerson:, in ${group}:group:.`
        case 'preference':
            return $localize`${actor}:person: changed how much ${person}:groupPerson: likes ${game}:game:, in ${group}:group:.`
        case 'preference_removed':
            return $localize`${actor}:person: removed what ${person}:groupPerson: thinks of ${game}:game:, in ${group}:group:.`
        default:
            // Written before the API stored what changed: the stored message says it.
            return null
    }
}

const isIdList = (value: unknown): value is Array<number> => Array.isArray(value) && value.every((item) => typeof item === 'number')

/** "Ana added Catan to their shelf.", "… removed Azul from their shelf.", "… added Catan to their shelf and removed Azul." */
function shelfChange(actor: string, data: Record<string, unknown>, titles: Map<number, string>): string | null {
    const added = isIdList(data['added']) ? data['added'] : []
    const removed = isIdList(data['removed']) ? data['removed'] : []
    const addedList = added.length > 0 ? listGames(added, titles) : null
    const removedList = removed.length > 0 ? listGames(removed, titles) : null

    if (addedList && removedList)
        return $localize`${actor}:person: added ${addedList}:games: to their shelf and removed ${removedList}:otherGames:.`
    if (addedList) return $localize`${actor}:person: added ${addedList}:games: to their shelf.`
    if (removedList) return $localize`${actor}:person: removed ${removedList}:games: from their shelf.`
    return null
}

/**
 * "Catan", "Catan and Azul", "Catan, Azul and Root", "Catan, Azul and 3 other games". A game with no
 * title (gone from the catalogue) is counted instead: "Catan and one other game", "2 games".
 */
export function listGames(gameIds: Array<number>, titles: Map<number, string>): string {
    const candidates = gameIds.length <= NAMED_TITLES + 1 ? gameIds : gameIds.slice(0, NAMED_TITLES)
    const known = candidates.flatMap((gameId) => titles.get(gameId) ?? [])
    const rest = gameIds.length - known.length
    const others =
        known.length > 0
            ? rest === 1
                ? $localize`:A list of games ending in one more:one other game`
                : $localize`:A list of games ending in several more:${rest}:count: other games`
            : rest === 1
              ? $localize`:A game whose title is unknown:a game`
              : $localize`:Several games whose titles are unknown:${rest}:count: games`
    const named = rest === 0 ? known : [...known, others]

    return new Intl.ListFormat(intlLocale(), { type: 'conjunction' }).format(named)
}
