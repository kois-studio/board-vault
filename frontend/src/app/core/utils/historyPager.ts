import { signal } from '@angular/core'
import type { Observable, Subscription } from 'rxjs'
import type { HistoryPageOptions, HistoryPageType, HistoryRecordType } from '../../api/api.types'

/** Reads one page of history: `Api.getUserGamesHistory` bound to the signed-in user. */
export type HistoryPageReader = (options: HistoryPageOptions) => Observable<HistoryPageType>

/**
 * Your history a page at a time, newest first (#252): `reset` reads the first page of a filter, `loadMore` the
 * nights before the last one shown. A reset drops any page still on its way, so a slow answer for the old filter
 * never lands in the new list.
 */
export class HistoryPager {
    readonly entries = signal<Array<HistoryRecordType>>([])
    readonly hasMore = signal(false)
    /** The first page is on its way, or not asked for yet: an empty list is never shown as no nights too soon. */
    readonly loading = signal(true)
    /** An older page is on its way. */
    readonly loadingMore = signal(false)
    /** The first page failed: nothing to show. */
    readonly failed = signal(false)
    /** An older page failed: the nights shown stay, and the button tries again. */
    readonly moreFailed = signal(false)

    private filters: Omit<HistoryPageOptions, 'before' | 'limit'> = {}
    private request: Subscription | null = null

    constructor(
        private readonly read: HistoryPageReader,
        private readonly pageSize: number,
        /** Nights read by each `loadMore`, when a screen shows a few first and more after. */
        private readonly morePageSize = pageSize,
    ) {}

    /** Starts over with these filters. */
    reset(filters: Omit<HistoryPageOptions, 'before' | 'limit'> = {}): void {
        this.filters = filters
        this.entries.set([])
        this.hasMore.set(false)
        this.moreFailed.set(false)
        this.load(undefined)
    }

    /** Reads the nights before the last one shown; does nothing while a page is on its way or none remain. */
    loadMore(): void {
        const last = this.entries().at(-1)
        if (!last || !this.hasMore() || this.loading() || this.loadingMore()) return
        this.load(last.meetData.id)
    }

    /** Tries again what failed: the first page, or the older one. */
    retry(): void {
        if (this.failed()) this.reset(this.filters)
        else if (this.moreFailed()) this.loadMore()
    }

    /** Stops listening for a page on its way, when the screen closes. */
    destroy(): void {
        this.request?.unsubscribe()
        this.request = null
    }

    private load(before: number | undefined): void {
        // Only one page is ever on its way: one the reset dropped never answers.
        this.destroy()
        const first = before === undefined
        this.loading.set(first)
        this.loadingMore.set(!first)
        if (first) this.failed.set(false)
        else this.moreFailed.set(false)

        this.request = this.read({ ...this.filters, before, limit: first ? this.pageSize : this.morePageSize }).subscribe({
            next: (page) => {
                this.entries.update((entries) => (first ? page.entries : [...entries, ...page.entries]))
                this.hasMore.set(page.hasMore)
                ;(first ? this.loading : this.loadingMore).set(false)
            },
            error: () => {
                ;(first ? this.failed : this.moreFailed).set(true)
                ;(first ? this.loading : this.loadingMore).set(false)
            },
        })
    }
}
