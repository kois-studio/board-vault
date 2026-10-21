/** The most characters a display name may have; the API enforces the same limit. */
export const DISPLAY_NAME_MAX_LENGTH = 20

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * A display name cut to the shared limit: its first characters and "…". Names saved before the
 * limit can be longer; the API schemas cut every name on the way in, so a name reads the same on
 * every page however much room that page has.
 */
export function shortName(name: string): string {
    const characters = Array.from(graphemes.segment(name), ({ segment }) => segment)

    if (characters.length <= DISPLAY_NAME_MAX_LENGTH) return name
    return `${characters.slice(0, DISPLAY_NAME_MAX_LENGTH - 1).join('').trimEnd()}…`
}
