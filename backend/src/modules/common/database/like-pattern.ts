/** Goes after `LIKE ?` so `containsPattern` escapes hold: `normalizedTitle LIKE ? ${LIKE_ESCAPE}`. */
export const LIKE_ESCAPE = "ESCAPE '\\'"

/**
 * A LIKE pattern that matches `term` anywhere, reading `%`, `_` and `\` in it as
 * plain characters. Without this, a search for `__` matches every title.
 */
export function containsPattern(term: string): string {
    return `%${term.replace(/[\\%_]/g, '\\$&')}%`
}
