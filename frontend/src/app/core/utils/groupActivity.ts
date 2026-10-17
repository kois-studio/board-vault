import type { GroupActivityNameType, GroupActivityType } from '../../api/api.types'

/** How the history names someone: their current name, marked when they left (ADR-0018). */
export function activityName(person: GroupActivityNameType | null | undefined): string {
    if (!person) return 'someone'
    return person.standing === 'left' ? `${person.name} (left)` : person.name
}

/** "A", "A and B", "A, B and C". */
function list(names: Array<string>): string {
    if (names.length <= 1) return names[0] ?? ''
    return `${names.slice(0, -1).join(', ')} and ${names.at(-1)}`
}

function ids(entry: GroupActivityType, key: string): Array<number> {
    const value = entry.data[key]
    return Array.isArray(value) ? value.filter((id): id is number => typeof id === 'number') : []
}

function gameTitles(entry: GroupActivityType, key: string): Array<string> {
    return ids(entry, key).map((id) => entry.games.find((game) => game.id === id)?.title ?? 'a game')
}

function accountNames(entry: GroupActivityType, key: string): Array<string> {
    return ids(entry, key).map((id) => activityName(entry.accounts.find((account) => account.id === id)))
}

function personNames(entry: GroupActivityType, key: string): Array<string> {
    return ids(entry, key).map((id) => activityName(entry.people.find((person) => person.id === id)))
}

const PREFERENCES: Record<string, string> = {
    favorite: 'has {game} as a favourite',
    like: 'likes {game}',
    neutral: "doesn't mind {game}",
    avoid: 'would rather not play {game}',
}

/**
 * What one history entry says, as a sentence that starts with who did it: "Rita removed Catan
 * from Pedro's games". Unknown types still read as something, so an older app never shows a blank.
 */
export function describeActivity(entry: GroupActivityType): string {
    const actor = activityName(entry.actor)
    const person = activityName(entry.person)
    const game = entry.game?.title ?? 'a game'
    const night = 'a game night'

    switch (entry.type) {
        case 'session_planned':
            return `${actor} planned ${night}`
        case 'session_recorded':
            return `${actor} recorded ${night} that already happened`
        case 'session_started':
            return `${actor} started ${night}`
        case 'session_finished':
            return `${actor} finished ${night}`
        case 'session_cancelled':
            return `${actor} cancelled ${night}`
        case 'session_invites_changed': {
            const invited = [...accountNames(entry, 'addedAccountIds'), ...personNames(entry, 'addedPersonIds')]
            const uninvited = [...accountNames(entry, 'removedAccountIds'), ...personNames(entry, 'removedPersonIds')]
            const parts = [
                invited.length > 0 ? `invited ${list(invited)}` : '',
                uninvited.length > 0 ? `took ${list(uninvited)} off the list` : '',
            ]
            return `${actor} ${parts.filter(Boolean).join(' and ') || 'changed who is invited'} for ${night}`
        }
        case 'session_shortlist_changed': {
            const added = gameTitles(entry, 'addedGameIds')
            const removed = gameTitles(entry, 'removedGameIds')
            const shortlist = `the shortlist of ${night}`
            if (added.length > 0 && removed.length > 0)
                return `${actor} added ${list(added)} to ${shortlist} and took ${list(removed)} off it`
            if (added.length > 0) return `${actor} added ${list(added)} to ${shortlist}`
            if (removed.length > 0) return `${actor} took ${list(removed)} off ${shortlist}`
            return `${actor} changed ${shortlist}`
        }
        case 'session_bringer_changed': {
            const accountId = entry.data['accountId']
            const bringer =
                typeof accountId === 'number'
                    ? accountId === entry.actor.id
                        ? null
                        : activityName(entry.accounts.find((account) => account.id === accountId))
                    : typeof entry.data['groupPersonId'] === 'number'
                      ? activityName(entry.people.find((p) => p.id === entry.data['groupPersonId']))
                      : undefined
            if (bringer === null) return `${actor} will bring ${game} to ${night}`
            if (bringer === undefined) return `${actor} said nobody is bringing ${game} to ${night} yet`
            return `${actor} said ${bringer} will bring ${game} to ${night}`
        }
        case 'session_played_changed': {
            if (entry.data['corrected'] === true) return `${actor} corrected the record of ${night}`
            const added = gameTitles(entry, 'addedGameIds')
            const removed = gameTitles(entry, 'removedGameIds')
            const changed = gameTitles(entry, 'changedGameIds')
            const parts = [
                added.length > 0 ? `marked ${list(added)} as played` : '',
                removed.length > 0 ? `unmarked ${list(removed)}` : '',
                changed.length > 0 ? `changed who played ${list(changed)}` : '',
            ]
            return `${actor} ${parts.filter(Boolean).join(', ') || 'changed what was played'} on ${night}`
        }
        case 'session_rsvp':
            return entry.data['rsvpStatus'] === 'declined' ? `${actor} can't make ${night}` : `${actor} is coming to ${night}`
        case 'session_attendance_changed':
            return `${actor} recorded who came to ${night}`
        case 'session_results_changed': {
            if (typeof entry.data['plays'] === 'number') return `${actor} recorded results for an individual play on ${night}`
            const winners = [...accountNames(entry, 'winnerAccountIds'), ...personNames(entry, 'winnerPersonIds')]
            if (winners.length > 0) return `${actor} recorded that ${list(winners)} won ${game}`
            if (entry.data['scored'] === true) return `${actor} recorded the scores of ${game}`
            return `${actor} cleared who won ${game}`
        }
        case 'person_added':
            return `${actor} added ${person} to the group`
        case 'person_updated':
            if (entry.data['renamed'] === true) return `${actor} renamed ${person}`
            return `${actor} changed ${person}'s picture`
        case 'person_archived':
            return `${actor} archived ${person}`
        case 'person_restored':
            return `${actor} brought back ${person}`
        case 'person_claimed':
            return `${actor} linked ${person} to their account`
        case 'person_game_set': {
            const status = entry.data['status']
            if (status === 'asserted') return `${actor} said ${person} has ${game}`
            if (status === 'disputed') return `${actor} marked ${game} as not sure for ${person}`
            if (entry.data['previousStatus'] === 'asserted') return `${actor} removed ${game} from ${person}'s games`
            return `${actor} said ${person} doesn't have ${game}`
        }
        case 'person_preference_set': {
            const phrase = PREFERENCES[String(entry.data['preference'])] ?? 'has an opinion on {game}'
            return `${actor} said ${person} ${phrase.replace('{game}', game)}`
        }
        case 'person_preference_removed':
            return `${actor} removed what ${person} thinks of ${game}`
        case 'member_joined':
            return `${actor} joined the group`
        case 'member_left':
            return `${actor} left the group`
        case 'member_removed':
            return `${actor} removed ${activityName(entry.subject)} from the group`
        default:
            return `${actor} changed something in the group`
    }
}
