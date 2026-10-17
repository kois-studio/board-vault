/** Games that went onto and off someone's shelf. */
export type ShelfChange = { added: Array<number>; removed: Array<number> }

/** How many titles a message names before it counts the rest. */
const NAMED_TITLES = 2

const isIdList = (value: unknown): value is Array<number> => Array.isArray(value) && value.every(item => Number.isInteger(item))

/** The change an unread notification holds, or none when its data is not one (it is then rewritten). */
export function readShelfChange(data: unknown): ShelfChange {
    if (typeof data !== 'object' || data === null) return { added: [], removed: [] }
    const { added, removed } = data as Record<string, unknown>

    return isIdList(added) && isIdList(removed) ? { added, removed } : { added: [], removed: [] }
}

/**
 * Adds a new change to what the reader has not read yet, keeping only the net result: a game added
 * and then removed (or removed and then added back) is where the reader last saw it, so it drops
 * out. The latest games come first. Each game is in at most one list, once.
 */
export function mergeShelfChange(unread: ShelfChange, change: ShelfChange): ShelfChange {
    const added = [...unread.added]
    const removed = [...unread.removed]
    const apply = (gameId: number, into: Array<number>, undoes: Array<number>) => {
        const undone = undoes.indexOf(gameId)

        if (undone !== -1) undoes.splice(undone, 1)
        else if (!into.includes(gameId)) into.unshift(gameId)
    }

    for (const gameId of change.added) apply(gameId, added, removed)
    for (const gameId of change.removed) apply(gameId, removed, added)

    return { added, removed }
}

export const isEmptyShelfChange = (change: ShelfChange) => change.added.length === 0 && change.removed.length === 0

/** The games a message names, so their titles can be read in one go. */
export function namedShelfGames(change: ShelfChange): Array<number> {
    const named = (gameIds: Array<number>) => (gameIds.length <= NAMED_TITLES + 1 ? gameIds : gameIds.slice(0, NAMED_TITLES))

    return [...named(change.added), ...named(change.removed)]
}

/**
 * "Catan", "Catan and Azul", "Catan, Azul and Root", "Catan, Azul and 3 other games". A game with no
 * title (gone from the catalogue) is counted instead: "Catan and one other game", "2 games".
 */
function listGames(gameIds: Array<number>, titles: Map<number, string>): string {
    const candidates = gameIds.length <= NAMED_TITLES + 1 ? gameIds : gameIds.slice(0, NAMED_TITLES)
    const known = candidates.flatMap(gameId => titles.get(gameId) ?? [])
    const rest = gameIds.length - known.length
    const others = known.length > 0 ? (rest === 1 ? 'one other game' : `${rest} other games`) : rest === 1 ? 'a game' : `${rest} games`
    const named = rest === 0 ? known : [...known, others]

    return named.length === 1 ? named[0]! : `${named.slice(0, -1).join(', ')} and ${named.at(-1)}`
}

/** "Ana added Catan to their shelf.", "… removed Azul from their shelf.", "… added Catan to their shelf and removed Azul." */
export function describeShelfChange(actor: string, change: ShelfChange, titles: Map<number, string>): string {
    const added = change.added.length > 0 ? `added ${listGames(change.added, titles)} to their shelf` : null
    const removed = change.removed.length > 0 ? listGames(change.removed, titles) : null

    if (added && removed) return `${actor} ${added} and removed ${removed}.`
    if (added) return `${actor} ${added}.`
    return `${actor} removed ${removed ?? 'a game'} from their shelf.`
}
