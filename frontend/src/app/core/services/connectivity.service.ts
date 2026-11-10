import { computed, DestroyRef, Injectable, inject, signal } from '@angular/core'
import { Subject } from 'rxjs'

/**
 * The longest Try again can wait for an outcome: a read and its one retry (12 s + 1 s + 12 s), plus margin. A check
 * that never hears back (its requests were cancelled, nobody is signed in) stops showing as busy after this.
 */
export const CHECK_GIVES_UP_MS = 30_000

/**
 * Whether Board Vault can be reached right now (#241), so the app shows one calm banner instead of a pile of
 * error toasts, and says so while it shows data that may be out of date.
 *
 * - **Degraded** while the browser is offline, or since a request ended without an answer that a retry could
 *   fix (no answer, a timeout, a 502/503/504; reported by `resilienceInterceptor` after its own retry).
 * - **Recovers** on the next answer from Board Vault, or when the browser comes back online.
 *
 * `refreshes` asks the data shown to reload: on Try again, when the browser comes back online, and when Board Vault
 * answers again; never twice for the same recovery.
 */
@Injectable({ providedIn: 'root' })
export class ConnectivityService {
    private readonly offline = signal(typeof navigator !== 'undefined' && navigator.onLine === false)
    private readonly unanswered = signal(false)
    private readonly refreshRequested = new Subject<void>()
    /** A reload was asked for and no request has ended since: the answer it brings needs no second reload. */
    private reloadAwaitingOutcome = false
    private checkTimer: ReturnType<typeof setTimeout> | undefined

    /** True while Board Vault cannot be reached; the banner shows. */
    public readonly isDegraded = computed(() => this.offline() || this.unanswered())
    /** True from Try again until the next request ends, whatever its outcome. */
    public readonly isChecking = signal(false)
    /** Emits when the data shown should reload. */
    public readonly refreshes = this.refreshRequested.asObservable()

    constructor() {
        const destroyRef = inject(DestroyRef)
        destroyRef.onDestroy(() => clearTimeout(this.checkTimer))
        if (typeof window === 'undefined') return
        const wentOffline = () => this.offline.set(true)
        const cameBack = () => {
            this.offline.set(false)
            // Being online again says nothing about Board Vault: reloading finds out, and clears the banner if it answers.
            this.requestRefresh()
        }
        window.addEventListener('offline', wentOffline)
        window.addEventListener('online', cameBack)
        destroyRef.onDestroy(() => {
            window.removeEventListener('offline', wentOffline)
            window.removeEventListener('online', cameBack)
        })
    }

    /** A request ended without an answer a retry could fix. */
    public reportUnreachable(): void {
        this.ended()
        this.unanswered.set(true)
    }

    /** Board Vault answered a request (any status it chose, including a 4xx). */
    public reportAnswered(): void {
        const reloadAlreadyAsked = this.reloadAwaitingOutcome
        this.ended()
        if (!this.isDegraded()) return
        // An answer proves the connection works, even if the browser still says it is offline (some VPNs and
        // captive portals report navigator.onLine wrongly): otherwise the banner would never go away.
        this.offline.set(false)
        this.unanswered.set(false)
        // What failed while it could not be reached can load now, unless that reload is what brought this answer.
        if (!reloadAlreadyAsked) this.refreshRequested.next()
    }

    /**
     * A request ended in a way that says nothing about reaching Board Vault (a 500, or no sign-in token): the
     * banner stays as it is, but a check in progress is over.
     */
    public reportInconclusive(): void {
        this.ended()
    }

    /** Try again: reloads the data shown, which also finds out whether Board Vault answers again. */
    public retry(): void {
        this.isChecking.set(true)
        clearTimeout(this.checkTimer)
        this.checkTimer = setTimeout(() => this.isChecking.set(false), CHECK_GIVES_UP_MS)
        this.requestRefresh()
    }

    private requestRefresh(): void {
        this.reloadAwaitingOutcome = true
        this.refreshRequested.next()
    }

    private ended(): void {
        this.reloadAwaitingOutcome = false
        this.isChecking.set(false)
        clearTimeout(this.checkTimer)
    }
}
