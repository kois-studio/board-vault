import { readableName } from './plainName'

/** The most characters a display name may have; the API enforces the same limit. */
export const DISPLAY_NAME_MAX_LENGTH = 20

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * A display name cut to the shared limit: its first characters and "…". Names saved before the
 * limit can be longer; the API schemas cut every name on the way in, so a name reads the same on
 * every page however much room that page has. Layout characters saved before #350 are left out.
 */
export function shortName(name: string): string {
    return cutName(readableName(name), DISPLAY_NAME_MAX_LENGTH)
}

/** The most characters a group name may have; the API enforces the same limit for new names. */
export const GROUP_NAME_MAX_LENGTH = 40

/** A group name made readable and cut the same way, for names saved before the limits (#350). */
export function shortGroupName(name: string): string {
    return cutName(readableName(name), GROUP_NAME_MAX_LENGTH)
}

function cutName(name: string, max: number): string {
    const characters = Array.from(graphemes.segment(name), ({ segment }) => segment)

    if (characters.length <= max) return name
    return `${characters
        .slice(0, max - 1)
        .join('')
        .trimEnd()}…`
}
