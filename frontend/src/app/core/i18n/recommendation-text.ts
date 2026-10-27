import { formatNumber, intlLocale } from './format'

/** A reason the API gives as a code with its numbers (ADR-0024). */
export type ReasonCode = { code: string; values?: Record<string, number> }

const isOne = (count: number) => new Intl.PluralRules(intlLocale()).select(count) === 'one'

/** Why a game is recommended, in the page's language; null for a code this app does not know. */
export function reasonText({ code, values = {} }: ReasonCode): string | null {
    const owners = values['owners'] ?? 0
    const attendees = values['attendees'] ?? 0
    const players = values['players'] ?? 0
    const count = values['count'] ?? 0

    switch (code) {
        case 'owned_by':
            return values['people']
                ? $localize`:Recommendation reason:Owned by ${owners}:owners: of ${attendees}:people: selected people`
                : $localize`:Recommendation reason:Owned by ${owners}:owners: of ${attendees}:people: selected attendees`
        case 'fits_players':
            return isOne(players)
                ? $localize`:Recommendation reason:Fits ${players}:players: player`
                : $localize`:Recommendation reason:Fits ${players}:players: players`
        case 'duration':
            return $localize`:Recommendation reason:Estimated duration: ${values['minutes'] ?? 0}:minutes: minutes`
        case 'duration_unknown':
            return $localize`:Recommendation reason:Duration is not available`
        case 'rating':
            return $localize`:Recommendation reason, a rating out of 10:Selected-attendee rating: ${formatNumber(values['rating'] ?? 0, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}:rating:/10`
        case 'no_rating':
            return $localize`:Recommendation reason:No selected-attendee rating yet`
        case 'interested':
            return isOne(count)
                ? $localize`:Recommendation reason:${count}:count: selected attendee marked this as interesting`
                : $localize`:Recommendation reason:${count}:count: selected attendees marked this as interesting`
        case 'passed_before':
            return isOne(count)
                ? $localize`:Recommendation reason:${count}:count: selected participant passed on this before`
                : $localize`:Recommendation reason:${count}:count: selected participants passed on this before`
        case 'preferences_favor':
            return $localize`:Recommendation reason:The preferences of the people coming favor this game`
        case 'marked_avoid':
            return $localize`:Recommendation reason:Some selected people have marked this game to avoid`
        case 'not_played_yet':
            return $localize`:Recommendation reason:Not played by this group yet`
        case 'played_before':
            return $localize`:Recommendation reason:Previously played by this group`
        case 'strong_rating':
            return $localize`:Recommendation reason:Strong group rating`
        case 'shared_shelf':
            return $localize`:Recommendation reason:Builds on the group’s shared shelf`
        default:
            return null
    }
}

/** Why nothing could be recommended, in the page's language; null for a code this app does not know. */
export function noResultText({ code, values = {} }: ReasonCode): string | null {
    const players = values['players'] ?? 0

    switch (code) {
        case 'no_owned_games':
            return $localize`:No game can be recommended:No games are owned by the selected attendees.`
        case 'no_player_fit':
            return $localize`:No game can be recommended:No games owned by the selected attendees support ${players}:players: players.`
        case 'no_duration_fit':
            return $localize`:No game can be recommended:No games for ${players}:players: players fit within ${values['minutes'] ?? 0}:minutes: minutes.`
        case 'no_titled_games':
            return $localize`:No game can be recommended:No suitable titled games were found for the selected attendees and filters.`
        case 'no_people_games':
            return $localize`:No game can be recommended:No games are available from the selected group people.`
        default:
            return null
    }
}

/** The reasons in the page's language, or the API's English when it sent no codes or one is unknown. */
export function reasonsText(english: Array<string>, codes: Array<ReasonCode> | undefined): Array<string> {
    if (!codes || codes.length !== english.length) return english
    return codes.map((code, index) => reasonText(code) ?? english[index] ?? '')
}
