import { Component, computed, input } from '@angular/core'
import { SkeletonPlayedGamesComponent } from '../skeleton-played-games/skeleton-played-games.component'

const MAX_GAMES = 4
const MAX_PEOPLE = 6

const range = (count: number, max: number) => Array.from({ length: Math.min(count, max) }, (_, index) => index)

/**
 * What a game night's page shows under its header, while its group and people load (#260): the played games, the
 * shortlist and who is coming, in the same grid and sizes, with as many rows as the night already says it has.
 */
@Component({
    imports: [SkeletonPlayedGamesComponent],
    selector: 'app-skeleton-session-body',
    host: {
        class: 'block',
        '[class.motion-safe:animate-pulse]': '!nested()',
        'aria-hidden': 'true',
        'data-testid': 'session-body-skeleton',
    },
    template: `
        <div class="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
            <div class="min-w-0 space-y-8">
                @if (played() !== null) {
                    <div>
                        <div class="mb-3 flex h-7 items-center"><div class="h-5 w-28 rounded bg-bv-border"></div></div>
                        <app-skeleton-played-games [count]="played() ?? 0" [nested]="true" />
                    </div>
                }
                <div data-testid="shortlist-skeleton">
                    <div class="mb-3 flex h-7 items-center"><div class="h-5 w-24 rounded bg-bv-border"></div></div>
                    @if (shortlistRows().length === 0) {
                        <div class="rounded-lg border border-dashed border-bv-border p-4">
                            <div class="flex h-5 items-center"><div class="h-3.5 w-1/2 rounded bg-bv-border"></div></div>
                        </div>
                    } @else {
                        <ul class="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            @for (row of shortlistRows(); track row) {
                                <li class="min-w-0 rounded-lg border border-bv-border bg-bv-surface p-2">
                                    <div class="flex items-center gap-3">
                                        <div class="h-12 w-12 shrink-0 rounded-lg bg-bv-surface-2"></div>
                                        <div class="min-w-0 flex-1">
                                            <div class="flex h-6 items-center"><div class="h-4 w-2/3 rounded bg-bv-border"></div></div>
                                            <div class="flex h-4 items-center"><div class="h-3 w-1/3 rounded bg-bv-border"></div></div>
                                        </div>
                                    </div>
                                    @if (scheduled()) {
                                        <div class="mt-2 flex h-[33px] items-center border-t border-bv-border pt-2"><div class="h-3 w-1/2 rounded bg-bv-border"></div></div>
                                    }
                                </li>
                            }
                        </ul>
                    }
                </div>
            </div>

            <div class="min-w-0" data-testid="people-skeleton">
                <div class="rounded-lg border border-bv-border bg-bv-surface p-4 shadow-sm">
                    <div class="flex h-7 items-center"><div class="h-5 w-32 rounded bg-bv-border"></div></div>
                    <ul class="mt-3 divide-y divide-bv-border">
                        @for (row of peopleRows(); track row) {
                            <li class="flex items-center gap-3 py-2">
                                <div class="h-7 w-7 shrink-0 rounded-full bg-bv-surface-2"></div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex h-5 items-center"><div class="h-3.5 w-24 rounded bg-bv-border"></div></div>
                                    <div class="flex h-4 items-center"><div class="h-3 w-16 rounded bg-bv-border"></div></div>
                                </div>
                            </li>
                        }
                    </ul>
                </div>
            </div>
        </div>
    `,
})
export class SkeletonSessionBodyComponent {
    /** Inside another skeleton, which pulses for both. */
    readonly nested = input(false)
    /** How many games the night played, or null when it shows no played games (a planned night with none yet). */
    readonly played = input<number | null>(null)
    /** How many games are on its shortlist. */
    readonly shortlisted = input(3)
    /** A planned night: each shortlisted game also says who brings it. */
    readonly scheduled = input(true)
    /** How many people are invited. */
    readonly people = input(4)

    protected readonly shortlistRows = computed(() => range(this.shortlisted(), MAX_GAMES))
    protected readonly peopleRows = computed(() => range(Math.max(this.people(), 1), MAX_PEOPLE))
}
