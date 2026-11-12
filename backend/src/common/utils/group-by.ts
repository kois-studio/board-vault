/**
 * Rows read in one set-based query, listed by key, so each list is found at once instead of filtering every row
 * once per group, member or game (#289). Keys keep the order they first appear in; each list keeps the order of
 * its rows.
 */
export function groupBy<T, K>(items: Iterable<T>, keyOf: (item: T) => K): Map<K, Array<T>>
export function groupBy<T, K, V>(items: Iterable<T>, keyOf: (item: T) => K, valueOf: (item: T) => V): Map<K, Array<V>>
export function groupBy<T, K>(items: Iterable<T>, keyOf: (item: T) => K, valueOf: (item: T) => unknown = item => item) {
    const lists = new Map<K, Array<unknown>>()

    for (const item of items) {
        const key = keyOf(item)
        const list = lists.get(key)

        if (list) list.push(valueOf(item))
        else lists.set(key, [valueOf(item)])
    }

    return lists
}
