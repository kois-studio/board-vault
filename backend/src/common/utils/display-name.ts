/** The most characters a display name may have, for accounts and group people alike. */
export const DISPLAY_NAME_MAX_LENGTH = 20

const graphemes = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

/**
 * ## Short name - A display name cut to the shared limit
 * Names saved before the limit can be longer. Every place that writes one into text cuts it the
 * same way, so a name reads the same in a notification as in the app.
 * @param name a display name
 * @returns the name, or its first characters and "…" when it is longer than the limit
 */
export function shortName(name: string): string {
    const characters = Array.from(graphemes.segment(name), ({ segment }) => segment)

    if (characters.length <= DISPLAY_NAME_MAX_LENGTH) return name
    return `${characters
        .slice(0, DISPLAY_NAME_MAX_LENGTH - 1)
        .join('')
        .trimEnd()}…`
}
