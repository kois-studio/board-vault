import type { NoResultReasonDto, RecommendationReasonDto } from './play.types.js'

const plural = (count: number, one: string, other: string) => (count === 1 ? one : other)

/**
 * The English of a reason code, sent as `reasons` for older clients and logs. The app words the
 * codes itself in the page's language (ADR-0024).
 */
export function englishReason({ code, values = {} }: RecommendationReasonDto): string {
    const v = (key: string) => values[key] ?? 0

    switch (code) {
        case 'owned_by':
            return `Owned by ${v('owners')} of ${v('attendees')} ${v('people') ? 'selected people' : 'selected attendees'}`
        case 'fits_players':
            return `Fits ${v('players')} players`
        case 'duration':
            return `Estimated duration: ${v('minutes')} minutes`
        case 'duration_unknown':
            return 'Duration is not available'
        case 'rating':
            return `Selected-attendee rating: ${v('rating').toFixed(1)}/10`
        case 'no_rating':
            return 'No selected-attendee rating yet'
        case 'interested':
            return `${v('count')} ${plural(v('count'), 'selected attendee', 'selected attendees')} marked this as interesting`
        case 'passed_before':
            return `${v('count')} ${plural(v('count'), 'selected participant', 'selected participants')} passed on this before`
        case 'preferences_favor':
            return 'The preferences of the people coming favor this game'
        case 'marked_avoid':
            return 'Some selected people have marked this game to avoid'
        case 'not_played_yet':
            return 'Not played by this group yet'
        case 'played_before':
            return 'Previously played by this group'
        case 'strong_rating':
            return 'Strong group rating'
        case 'shared_shelf':
            return 'Builds on the group’s shared shelf'
    }
}

export function englishNoResultReason({ code, values = {} }: NoResultReasonDto): string {
    switch (code) {
        case 'no_owned_games':
            return 'No games are owned by the selected attendees.'
        case 'no_player_fit':
            return `No games owned by the selected attendees support ${values.players ?? 0} players.`
        case 'no_duration_fit':
            return `No games for ${values.players ?? 0} players fit within ${values.minutes ?? 0} minutes.`
        case 'no_titled_games':
            return 'No suitable titled games were found for the selected attendees and filters.'
        case 'no_people_games':
            return 'No games are available from the selected group people.'
    }
}
