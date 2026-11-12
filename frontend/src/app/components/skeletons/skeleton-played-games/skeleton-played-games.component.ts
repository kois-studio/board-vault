import { Component, computed, input } from '@angular/core'

/** At most this many rows: enough to hold the top of the list without a column of grey. */
const MAX_ROWS = 4

/** The games a game night played, while its plays load (#260): one card per game, in the size of the real ones. */
@Component({
    selector: 'app-skeleton-played-games',
    host: {
        class: 'block',
        '[class.motion-safe:animate-pulse]': '!nested()',
        'aria-hidden': 'true',
        'data-testid': 'played-games-skeleton',
    },
    template: `
        @if (rows().length === 0) {
            <div class="rounded-lg border border-dashed border-bv-border p-4">
                <div class="flex h-5 items-center"><div class="h-3.5 w-2/3 rounded bg-bv-border"></div></div>
            </div>
        } @else {
            <ul class="space-y-3">
                @for (row of rows(); track row) {
                    <li class="flex items-start gap-3 rounded-lg border border-bv-border bg-bv-surface p-4 shadow-sm">
                        <div class="h-14 w-14 shrink-0 rounded-lg bg-bv-surface-2"></div>
                        <div class="min-w-0 flex-1">
                            <div class="flex h-6 items-center"><div class="h-4 w-1/2 rounded bg-bv-border"></div></div>
                            <div class="mt-0.5 flex h-5 items-center"><div class="h-3 w-1/3 rounded bg-bv-border"></div></div>
                        </div>
                    </li>
                }
            </ul>
        }
        @if (markable()) {
            <div class="mt-6">
                <div class="mb-2 flex h-5 items-center"><div class="h-3.5 w-36 rounded bg-bv-border"></div></div>
                <div class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <div class="h-[58px] rounded-lg border border-bv-border bg-bv-surface"></div>
                    <div class="h-[58px] rounded-lg border border-bv-border bg-bv-surface"></div>
                </div>
            </div>
        }
    `,
})
export class SkeletonPlayedGamesComponent {
    /** Inside another skeleton, which pulses for both. */
    readonly nested = input(false)
    /** How many games the night played, as the night itself says. */
    readonly count = input(0)
    /** "Mark a game as played" follows the list, for someone running the night. */
    readonly markable = input(false)
    protected readonly rows = computed(() => Array.from({ length: Math.min(this.count(), MAX_ROWS) }, (_, index) => index))
}
