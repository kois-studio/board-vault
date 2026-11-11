import { computed, type Signal, signal, type WritableSignal } from '@angular/core'
import { catchError, map, type Observable, of, Subscription, startWith } from 'rxjs'

/**
 * The one state of a piece of data a page shows (#256):
 *
 * - `loading`: nothing to show yet, and it is on its way.
 * - `refreshing`: what is shown stays while a newer copy is on its way.
 * - `error`: the last load failed. `value` is what loaded before, if anything: a failed refresh keeps it.
 * - `ready`: loaded. Empty is ready with nothing in it, so an empty state can only follow a successful load.
 */
export type ResourceState<T> =
    | { readonly status: 'loading'; readonly value: undefined }
    | { readonly status: 'refreshing'; readonly value: T }
    | { readonly status: 'error'; readonly value: T | undefined; readonly error: unknown }
    | { readonly status: 'ready'; readonly value: T }

export type ResourceStatus = ResourceState<unknown>['status']

export const loadingState = <T>(): ResourceState<T> => ({ status: 'loading', value: undefined })
export const readyState = <T>(value: T): ResourceState<T> => ({ status: 'ready', value })

/** True once the data has loaded at least once: there is a value to show, even while it refreshes or after a failed refresh. */
export const hasLoaded = <T>(state: ResourceState<T>): state is ResourceState<T> & { readonly value: T } =>
    state.status === 'ready' || state.status === 'refreshing' || (state.status === 'error' && state.value !== undefined)

/** The value only when it is known: loaded and the last load did not fail. What a count or an empty state may rely on. */
export const settledValue = <T>(state: ResourceState<T>): T | undefined =>
    state.status === 'ready' || state.status === 'refreshing' ? state.value : undefined

/**
 * Turns a read into its state: `loading` (or `refreshing` with `previous`) until it answers, then
 * `ready` or `error`. For a page's own reads; `DataService` keeps its lists in a `ResourceSignal`.
 */
export function toResourceState<T>(source: Observable<T>, previous?: T): Observable<ResourceState<T>> {
    const start: ResourceState<T> = previous === undefined ? loadingState() : { status: 'refreshing', value: previous }
    return source.pipe(
        map((value) => readyState(value)),
        catchError((error: unknown) => of<ResourceState<T>>({ status: 'error', value: previous, error })),
        startWith(start),
    )
}

/**
 * A piece of data, its loads, and its state, as signals. `value` is the data itself, which writes elsewhere
 * may change in place (adding a game, leaving a group); `state` is what a page renders through `<app-async>`.
 *
 * A new load cancels the one still on its way, so an older answer can never land after a newer one. A load
 * never empties `value`: what is shown stays until the new answer replaces it.
 */
export class ResourceSignal<T> {
    /** The data. Starts as `initial`, which is never shown as an answer: `state` stays `loading` until a load succeeds. */
    readonly value: WritableSignal<T>
    readonly state: Signal<ResourceState<T>>

    private readonly loaded = signal(false)
    private readonly inFlight = signal(false)
    private readonly failure = signal<{ error: unknown } | null>(null)
    private subscription: Subscription | null = null
    /** The load running now: answers from any other are ignored. */
    private current: object | null = null

    constructor(private readonly initial: T) {
        this.value = signal(initial)
        this.state = computed<ResourceState<T>>(() => {
            const value = this.value()
            const loaded = this.loaded()
            if (this.inFlight()) return loaded ? { status: 'refreshing', value } : loadingState()
            const failure = this.failure()
            if (failure) return { status: 'error', value: loaded ? value : undefined, error: failure.error }
            return loaded ? readyState(value) : loadingState()
        })
    }

    /**
     * Loads it: `apply` stores the answer (by default it replaces `value`), `failed` runs when the read fails.
     * Cancels a load still on its way.
     */
    load(source: Observable<T>, handlers: { apply?: (value: T) => void; failed?: (error: unknown) => void } = {}): void {
        this.cancel()
        const load = {}
        this.current = load
        this.inFlight.set(true)
        this.failure.set(null)
        const settle = () => {
            this.current = null
            this.subscription = null
            this.inFlight.set(false)
        }
        let answered = false
        const subscription = source.subscribe({
            next: (value) => {
                if (this.current !== load) return
                answered = true
                if (handlers.apply) handlers.apply(value)
                else this.value.set(value)
                this.loaded.set(true)
            },
            error: (error: unknown) => {
                if (this.current !== load) return
                settle()
                this.failure.set({ error })
                handlers.failed?.(error)
            },
            complete: () => {
                if (this.current !== load) return
                settle()
                // Ended without an answer: nothing new to show, so it failed rather than staying "loading".
                if (!answered) {
                    const error = new Error('The load ended without an answer')
                    this.failure.set({ error })
                    handlers.failed?.(error)
                }
            },
        })
        // A source that answered at once has settled already; keep the subscription only while it runs.
        if (this.current === load) this.subscription = subscription
    }

    /** Stores a value read some other way (a quiet refresh): it is loaded, and an earlier failure is over. */
    set(value: T): void {
        this.value.set(value)
        this.loaded.set(true)
        this.failure.set(null)
    }

    /** Stops a load on its way, keeping what is shown. */
    cancel(): void {
        this.current = null
        this.subscription?.unsubscribe()
        this.subscription = null
        this.inFlight.set(false)
    }

    /** Back to nothing loaded, as at sign-out. */
    reset(): void {
        this.cancel()
        this.value.set(this.initial)
        this.loaded.set(false)
        this.failure.set(null)
    }
}

/** A load is on its way, whether or not something is shown meanwhile. */
export const isPending = <T>(state: ResourceState<T>): boolean => state.status === 'loading' || state.status === 'refreshing'

/** The same state over something derived from its value, such as a count or a filtered list. */
export function mapState<T, U>(state: ResourceState<T>, project: (value: T) => U): ResourceState<U> {
    switch (state.status) {
        case 'loading':
            return loadingState()
        case 'refreshing':
            return { status: 'refreshing', value: project(state.value) }
        case 'error':
            return { status: 'error', value: state.value === undefined ? undefined : project(state.value), error: state.error }
        case 'ready':
            return readyState(project(state.value))
    }
}

/**
 * Nothing loaded yet: the moment for a skeleton in place of the content. A refresh keeps what is shown, so it is not
 * a first load; use `isPending` where any load on its way matters (waiting for fresh data, a busy control).
 */
export const isFirstLoad = <T>(state: ResourceState<T>): boolean => state.status === 'loading'
