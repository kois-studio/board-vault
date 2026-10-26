import type { GroupActivityNameType, GroupActivityType } from '../../api/api.types'
import { formatList } from '../i18n/format'

/** How the history names someone: their current name, marked when they left (ADR-0018). */
export function activityName(person: GroupActivityNameType | null | undefined): string {
    if (!person) return $localize`:Group history line, the name used for a person the history no longer knows:someone`
    return person.standing === 'left'
        ? $localize`:A name in a group's history, of someone who left the group:${person.name}:name: (left)`
        : person.name
}

function ids(entry: GroupActivityType, key: string): Array<number> {
    const value = entry.data[key]
    return Array.isArray(value) ? value.filter((id): id is number => typeof id === 'number') : []
}

/** The name used for a game the history no longer knows. */
const aGame = () => $localize`:Group history line, the name used for a game the catalogue no longer has:a game`

function gameTitles(entry: GroupActivityType, key: string): Array<string> {
    return ids(entry, key).map((id) => entry.games.find((game) => game.id === id)?.title ?? aGame())
}

function accountNames(entry: GroupActivityType, key: string): Array<string> {
    return ids(entry, key).map((id) => activityName(entry.accounts.find((account) => account.id === id)))
}

function personNames(entry: GroupActivityType, key: string): Array<string> {
    return ids(entry, key).map((id) => activityName(entry.people.find((person) => person.id === id)))
}

/** "Rita said Pedro likes Catan", one sentence per preference. */
function preferenceSet(actor: string, person: string, game: string, preference: unknown): string {
    switch (preference) {
        case 'favorite':
            return $localize`:Group history line; actor and person are names, game is a game title:${actor}:actor: said ${person}:person: has ${game}:game: as a favourite`
        case 'like':
            return $localize`:Group history line; actor and person are names, game is a game title:${actor}:actor: said ${person}:person: likes ${game}:game:`
        case 'neutral':
            return $localize`:Group history line; actor and person are names, game is a game title:${actor}:actor: said ${person}:person: doesn’t mind ${game}:game:`
        case 'avoid':
            return $localize`:Group history line; actor and person are names, game is a game title:${actor}:actor: said ${person}:person: would rather not play ${game}:game:`
        default:
            return $localize`:Group history line, for a preference this version of the app does not know; actor and person are names, game is a game title:${actor}:actor: said ${person}:person: has an opinion on ${game}:game:`
    }
}

/**
 * What one history entry says, as a sentence that starts with who did it: "Rita removed Catan
 * from Pedro's games". Unknown types still read as something, so an older app never shows a blank.
 */
export function describeActivity(entry: GroupActivityType): string {
    const actor = activityName(entry.actor)
    const person = activityName(entry.person)
    const game = entry.game?.title ?? aGame()

    switch (entry.type) {
        case 'session_planned':
            return $localize`:Group history line; actor is a name:${actor}:actor: planned a game night`
        case 'session_recorded':
            return $localize`:Group history line; actor is a name:${actor}:actor: recorded a game night that already happened`
        case 'session_started':
            return $localize`:Group history line; actor is a name:${actor}:actor: started a game night`
        case 'session_finished':
            return $localize`:Group history line; actor is a name:${actor}:actor: finished a game night`
        case 'session_cancelled':
            return $localize`:Group history line; actor is a name:${actor}:actor: cancelled a game night`
        case 'session_invites_changed': {
            const invited = formatList([...accountNames(entry, 'addedAccountIds'), ...personNames(entry, 'addedPersonIds')])
            const uninvited = formatList([...accountNames(entry, 'removedAccountIds'), ...personNames(entry, 'removedPersonIds')])
            if (invited && uninvited)
                return $localize`:Group history line; actor is a name, invited and uninvited are lists of names:${actor}:actor: invited ${invited}:invited: and took ${uninvited}:uninvited: off the list for a game night`
            if (invited)
                return $localize`:Group history line; actor is a name, invited is a list of names:${actor}:actor: invited ${invited}:invited: for a game night`
            if (uninvited)
                return $localize`:Group history line; actor is a name, uninvited is a list of names:${actor}:actor: took ${uninvited}:uninvited: off the list for a game night`
            return $localize`:Group history line; actor is a name:${actor}:actor: changed who is invited for a game night`
        }
        case 'session_shortlist_changed': {
            const added = formatList(gameTitles(entry, 'addedGameIds'))
            const removed = formatList(gameTitles(entry, 'removedGameIds'))
            if (added && removed)
                return $localize`:Group history line; actor is a name, added and removed are lists of game titles:${actor}:actor: added ${added}:added: to the shortlist of a game night and took ${removed}:removed: off it`
            if (added)
                return $localize`:Group history line; actor is a name, added is a list of game titles:${actor}:actor: added ${added}:added: to the shortlist of a game night`
            if (removed)
                return $localize`:Group history line; actor is a name, removed is a list of game titles:${actor}:actor: took ${removed}:removed: off the shortlist of a game night`
            return $localize`:Group history line; actor is a name:${actor}:actor: changed the shortlist of a game night`
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
            if (bringer === null)
                return $localize`:Group history line; actor is a name, game is a game title:${actor}:actor: will bring ${game}:game: to a game night`
            if (bringer === undefined)
                return $localize`:Group history line; actor is a name, game is a game title:${actor}:actor: said nobody is bringing ${game}:game: to a game night yet`
            return $localize`:Group history line; actor and bringer are names, game is a game title:${actor}:actor: said ${bringer}:bringer: will bring ${game}:game: to a game night`
        }
        case 'session_played_changed': {
            if (entry.data['corrected'] === true)
                return $localize`:Group history line; actor is a name:${actor}:actor: corrected the record of a game night`
            const added = formatList(gameTitles(entry, 'addedGameIds'))
            const removed = formatList(gameTitles(entry, 'removedGameIds'))
            const changed = formatList(gameTitles(entry, 'changedGameIds'))
            // Each change is a phrase of its own, so a line with two or three of them joins the phrases with commas.
            const parts = [
                added
                    ? $localize`:Part of a group history line, joined with others by commas into what someone changed on a game night; games is a list of game titles:marked ${added}:games: as played`
                    : '',
                removed
                    ? $localize`:Part of a group history line, joined with others by commas into what someone changed on a game night; games is a list of game titles:unmarked ${removed}:games:`
                    : '',
                changed
                    ? $localize`:Part of a group history line, joined with others by commas into what someone changed on a game night; games is a list of game titles:changed who played ${changed}:games:`
                    : '',
            ].filter(Boolean)
            if (parts.length === 0)
                return $localize`:Group history line; actor is a name:${actor}:actor: changed what was played on a game night`
            return $localize`:Group history line; actor is a name, changes is one or more parts such as marked Catan as played, joined by commas:${actor}:actor: ${parts.join(', ')}:changes: on a game night`
        }
        case 'session_rsvp':
            return entry.data['rsvpStatus'] === 'declined'
                ? $localize`:Group history line; actor is a name:${actor}:actor: can’t make a game night`
                : $localize`:Group history line; actor is a name:${actor}:actor: is coming to a game night`
        case 'session_attendance_changed':
            return $localize`:Group history line; actor is a name:${actor}:actor: recorded who came to a game night`
        case 'session_results_changed': {
            if (typeof entry.data['plays'] === 'number')
                return $localize`:Group history line; actor is a name:${actor}:actor: recorded results for an individual play on a game night`
            const winners = [...accountNames(entry, 'winnerAccountIds'), ...personNames(entry, 'winnerPersonIds')]
            if (winners.length > 0)
                return $localize`:Group history line; actor is a name, winners is a list of names, game is a game title:${actor}:actor: recorded that ${formatList(winners)}:winners: won ${game}:game:`
            if (entry.data['scored'] === true)
                return $localize`:Group history line; actor is a name, game is a game title:${actor}:actor: recorded the scores of ${game}:game:`
            return $localize`:Group history line; actor is a name, game is a game title:${actor}:actor: cleared who won ${game}:game:`
        }
        case 'person_added':
            return $localize`:Group history line; actor and person are names:${actor}:actor: added ${person}:person: to the group`
        case 'person_updated':
            if (entry.data['renamed'] === true)
                return $localize`:Group history line; actor and person are names:${actor}:actor: renamed ${person}:person:`
            return $localize`:Group history line; actor and person are names:${actor}:actor: changed ${person}:person:’s picture`
        case 'person_archived':
            return $localize`:Group history line; actor and person are names:${actor}:actor: archived ${person}:person:`
        case 'person_restored':
            return $localize`:Group history line; actor and person are names:${actor}:actor: brought back ${person}:person:`
        case 'person_claimed':
            return $localize`:Group history line, someone linking a group person to their own account; actor and person are names:${actor}:actor: linked ${person}:person: to their account`
        case 'person_game_set': {
            const status = entry.data['status']
            if (status === 'asserted')
                return $localize`:Group history line; actor and person are names, game is a game title:${actor}:actor: said ${person}:person: has ${game}:game:`
            if (status === 'disputed')
                return $localize`:Group history line; actor and person are names, game is a game title:${actor}:actor: marked ${game}:game: as not sure for ${person}:person:`
            if (entry.data['previousStatus'] === 'asserted')
                return $localize`:Group history line; actor and person are names, game is a game title:${actor}:actor: removed ${game}:game: from ${person}:person:’s games`
            return $localize`:Group history line; actor and person are names, game is a game title:${actor}:actor: said ${person}:person: doesn’t have ${game}:game:`
        }
        case 'person_preference_set':
            return preferenceSet(actor, person, game, entry.data['preference'])
        case 'person_preference_removed':
            return $localize`:Group history line; actor and person are names, game is a game title:${actor}:actor: removed what ${person}:person: thinks of ${game}:game:`
        case 'member_joined':
            return $localize`:Group history line; actor is a name:${actor}:actor: joined the group`
        case 'member_left':
            return $localize`:Group history line; actor is a name:${actor}:actor: left the group`
        case 'member_removed':
            return $localize`:Group history line; actor and person are names:${actor}:actor: removed ${activityName(entry.subject)}:person: from the group`
        default:
            return $localize`:Group history line, for a change this version of the app does not know; actor is a name:${actor}:actor: changed something in the group`
    }
}
