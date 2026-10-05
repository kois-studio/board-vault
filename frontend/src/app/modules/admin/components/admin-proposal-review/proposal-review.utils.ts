import type { TagType } from '../../../../api/api.types'

/**
 * The tags a proposer typed. The form sends "strategy, family"; older clients and the API docs use a JSON array.
 */
export function parseProposedTags(raw: string | null): Array<string> {
    if (!raw?.trim()) return []

    let names: Array<unknown> = raw.split(',')
    try {
        const parsed: unknown = JSON.parse(raw)
        if (Array.isArray(parsed)) names = parsed
    } catch {
        // Not JSON: the comma-separated form.
    }

    const seen = new Set<string>()
    return names
        .filter((name): name is string => typeof name === 'string')
        .map((name) => name.trim())
        .filter((name) => {
            const key = name.toLowerCase()
            if (!name || seen.has(key)) return false
            seen.add(key)
            return true
        })
}

/** The catalogue tags whose name matches a proposed one, ignoring case and spacing. */
export function matchProposedTags(proposed: Array<string>, tags: Array<TagType>): Array<number> {
    const normalize = (name: string) =>
        name
            .toLowerCase()
            .replace(/[\s_-]+/g, ' ')
            .trim()
    const wanted = new Set(proposed.map(normalize))
    return tags.filter((tag) => wanted.has(normalize(tag.name))).map((tag) => tag.id)
}

/**
 * Searches for possible duplicates: the whole title, then its three longest words,
 * so "Azul: Summer Pavilion" still finds "Azul".
 */
export function duplicateSearchTerms(title: string): Array<string> {
    const whole = title.trim()
    const words = whole
        .split(/[^\p{L}\p{N}]+/u)
        .filter((word) => word.length >= 4)
        .sort((a, b) => b.length - a.length)
        .slice(0, 3)

    return [...new Set([whole, ...words].filter((term) => term.length >= 2))]
}

/** Quick reasons for a rejection; the admin can edit the text before sending. */
export const QUICK_REJECTION_REASONS = [
    'This is not a board game.',
    'There is not enough information to add it. Propose it again with the publisher or a link.',
    'This is an expansion, not a base game.',
] as const
