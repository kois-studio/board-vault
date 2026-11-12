import { Component, input } from '@angular/core'

/** A group's recent game nights while they load (#260): the three cards of the group page, in their size. */
@Component({
    selector: 'app-skeleton-recent-sessions',
    host: {
        class: 'block',
        '[class.motion-safe:animate-pulse]': '!nested()',
        'aria-hidden': 'true',
        'data-testid': 'recent-sessions-skeleton',
    },
    template: `
        <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
            @for (card of cards; track card) {
                <div class="rounded-2xl border border-bv-border bg-bv-surface p-5 shadow-sm">
                    <div class="flex items-start justify-between gap-3">
                        <div class="min-w-0 flex-1">
                            <div class="flex h-6 items-center"><div class="h-4 w-32 rounded bg-bv-border"></div></div>
                            <div class="mt-1 flex h-5 items-center"><div class="h-3 w-40 max-w-full rounded bg-bv-border"></div></div>
                            <div class="mt-1 flex h-5 items-center"><div class="h-3 w-24 rounded bg-bv-border"></div></div>
                        </div>
                        <div class="flex h-5 items-center"><div class="h-3 w-8 rounded bg-bv-border"></div></div>
                    </div>
                    <ul class="mt-4 space-y-3">
                        @for (game of games; track game) {
                            <li class="flex items-center gap-3">
                                <div class="h-10 w-10 shrink-0 rounded-lg bg-bv-surface-2"></div>
                                <div class="flex h-5 flex-1 items-center"><div class="h-3.5 w-2/3 rounded bg-bv-border"></div></div>
                            </li>
                        }
                    </ul>
                </div>
            }
        </div>
    `,
})
export class SkeletonRecentSessionsComponent {
    /** Inside another skeleton, which pulses for both. */
    readonly nested = input(false)
    protected readonly cards = [1, 2, 3]
    protected readonly games = [1, 2]
}
