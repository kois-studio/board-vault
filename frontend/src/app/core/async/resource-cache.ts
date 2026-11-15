import { type DestroyRef, type Signal, untracked } from '@angular/core'
import { hasLoaded, type ResourceState } from './resource-state'

/**
 * How long an answer counts as fresh. A page opened again within it shows what is kept and asks nothing; opened later,
 * it shows what is kept at once and reads it again quietly (#263, ADR-0029).
 */
export const FRESH_FOR_MS = 30_000

/** One kept read: its `ResourceSignal`, how to load it with its loading state and failure toast, and how quietly. */
export interface CachedRead {
    readonly resource: {
        readonly state: Signal<ResourceState<unknown>>
        readonly busy: boolean
        readonly answeredAt: number | null
        cancel(): void
    }
    /** A load that shows: `loading` the first time, `refreshing` after, and says so when it fails. */
    load(): void
    /** A read that keeps what is shown and says nothing when it fails (`ResourceSignal.revalidate`). */
    revalidate(): void
}

/**
 * Reads kept by key, loaded when a page first shows them instead of all at sign-in (#263, ADR-0029):
 *
 * - A page names the keys it shows with `use`. The first use loads a key; later uses within `FRESH_FOR_MS` ask
 *   nothing, and after it show what is kept while it is read again quietly.
 * - A read already on its way is shared: a second use while it runs asks nothing.
 * - After a write, `invalidate` reloads a key some open page shows, and otherwise marks it stale, so the next page
 *   showing it reloads it (`refreshing`). An answer still on its way for a key nobody shows is dropped, since it may
 *   predate the write.
 * - Nothing loads while nobody is signed in. `start` loads what the open pages use; `stop` forgets what is stale.
 *   Emptying the values at sign-out is the owner's job (`ResourceSignal.reset`).
 */
export class ResourceCache<K extends string> {
    private active = false
    private readonly users = new Map<K, number>()
    private readonly stale = new Set<K>()

    constructor(
        private readonly reads: Record<K, CachedRead>,
        private readonly freshForMs = FRESH_FOR_MS,
    ) {}

    /** A page shows these keys until `destroyRef` is destroyed: each is loaded, or refreshed if it is no longer fresh. */
    use(keys: ReadonlyArray<K>, destroyRef: DestroyRef): void {
        for (const key of keys) this.users.set(key, (this.users.get(key) ?? 0) + 1)
        destroyRef.onDestroy(() => {
            for (const key of keys) this.users.set(key, Math.max(0, (this.users.get(key) ?? 0) - 1))
        })
        for (const key of keys) this.ensure(key)
    }

    /** Some open page shows it. */
    isUsed(key: K): boolean {
        return (this.users.get(key) ?? 0) > 0
    }

    /**
     * Loads it if it never loaded (or its first load failed) or a write changed it since, and reads it again quietly
     * if it is no longer fresh.
     */
    ensure(key: K): void {
        if (!this.active) return
        const read = this.reads[key]
        untracked(() => {
            if (read.resource.busy) return
            if (!hasLoaded(read.resource.state())) {
                this.stale.delete(key)
                read.load()
                return
            }
            // Changed by a write since: it reloads as it would have on an open page, `refreshing`, so a page never
            // shows the copy from before the write as if it were current (#326).
            if (this.stale.delete(key)) {
                read.load()
                return
            }
            const age = Date.now() - (read.resource.answeredAt ?? 0)
            if (age >= this.freshForMs) read.revalidate()
        })
    }

    /**
     * It changed (a write): reloaded now when an open page shows it, as before (#256), or else read again by the next
     * page that shows it. `load` replaces the key's own load for this once (a cheaper read for a smaller change).
     */
    invalidate(key: K, load: () => void = () => this.reads[key].load()): void {
        if (!this.active) return
        const read = this.reads[key]
        if (this.isUsed(key)) {
            this.stale.delete(key)
            untracked(load)
            return
        }
        read.resource.cancel()
        this.stale.add(key)
    }

    /** Someone signed in: loads what the open pages show. */
    start(): void {
        this.active = true
        this.stale.clear()
        for (const [key, count] of this.users) if (count > 0) this.ensure(key)
    }

    /** Nobody is signed in: nothing loads until `start`. */
    stop(): void {
        this.active = false
        this.stale.clear()
    }
}
