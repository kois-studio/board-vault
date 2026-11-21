import { DOCUMENT } from '@angular/common'
import { DestroyRef, Injectable, inject } from '@angular/core'
import { filter, fromEvent, map, Observable, of, take } from 'rxjs'

/**
 * A request sent this soon after the page woke can hang on a connection the sleep broke: a timeout then is the
 * device's doing, not Board Vault's (#355).
 */
export const WAKE_GRACE_MS = 5_000
/** A time limit whose timer fires this much later than due ran out while the page was frozen. */
export const LATE_TIMER_MS = 2_000

/**
 * When the page last woke: came back into view, was restored from the back-forward cache, or came back online
 * (#355). iOS and macOS freeze a tab in the background or while the device sleeps; a request in flight then, or sent
 * the moment it wakes, can hang or have its time limit fire late, which says nothing about Board Vault.
 *
 * It listens on the window in the capture phase, so it hears a wake before any page's own listener on the document
 * sends a request because of it (the inbox looks again when the app comes back into view).
 */
@Injectable({ providedIn: 'root' })
export class PageWakeService {
    private readonly document = inject(DOCUMENT)
    private wokeAt = Number.NEGATIVE_INFINITY

    constructor() {
        const window = this.document.defaultView
        if (!window) return
        const woke = () => {
            if (this.document.visibilityState === 'visible') this.wokeAt = Date.now()
        }
        const events = ['visibilitychange', 'pageshow', 'online'] as const
        for (const event of events) window.addEventListener(event, woke, true)
        inject(DestroyRef).onDestroy(() => {
            for (const event of events) window.removeEventListener(event, woke, true)
        })
    }

    /** Whether the page cannot be seen now. */
    public isHidden(): boolean {
        return this.document.visibilityState === 'hidden'
    }

    /** Whether the page woke less than `WAKE_GRACE_MS` ago. */
    public justWoke(now = Date.now()): boolean {
        return now - this.wokeAt < WAKE_GRACE_MS
    }

    /** Emits each time the page goes out of view. */
    public hides(): Observable<void> {
        return fromEvent(this.document, 'visibilitychange').pipe(
            filter(() => this.isHidden()),
            map(() => undefined),
        )
    }

    /** Emits once the page can be seen: at once if it already can. */
    public visible(): Observable<void> {
        if (!this.isHidden()) return of(undefined)
        return fromEvent(this.document, 'visibilitychange').pipe(
            filter(() => !this.isHidden()),
            take(1),
            map(() => undefined),
        )
    }
}
