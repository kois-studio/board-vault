import type { PublicUserType } from '../../api/api.types'

/** "Ana, Bo, Cy", or the first three and "+ 2 more"; empty without anyone. */
export function attendeeNames(attendees: Array<Pick<PublicUserType, 'displayName' | 'username'>>): string {
    const names = attendees.map((member) => member.displayName || member.username)
    // Commas only, as the list may be cut short: "and" would end it before the "+ 2 more".
    if (names.length <= 3) return names.join(', ')
    const shown = names.slice(0, 3).join(', ')
    const more = names.length - 3
    // One message for any count: the translations say "+ 2 more" in words that need no plural.
    return $localize`:A list of the first three names and how many more, such as Ana, Bo, Cy + 2 more:${shown}:names: + ${more}:count: more`
}

export function formatAttendeeSummary(attendees: Array<Pick<PublicUserType, 'displayName' | 'username'>>): string {
    if (attendees.length === 0) return $localize`:Line on a played game night that recorded nobody as there:Attendance not recorded`
    return $localize`:Who came to a played game night; the placeholder is a list of names:With ${attendeeNames(attendees)}:names:`
}
