import { Component } from '@angular/core'

/** A group's standings and stats while they load (#260): the heading and two ranked lists of the group page. */
@Component({
    selector: 'app-skeleton-standings',
    host: { class: 'block motion-safe:animate-pulse', 'aria-hidden': 'true', 'data-testid': 'standings-skeleton' },
    template: `
        <div class="mt-1 flex h-8 items-center"><div class="h-6 w-56 max-w-full rounded bg-bv-border"></div></div>
        <div class="mt-1 flex h-6 items-center"><div class="h-4 w-72 max-w-full rounded bg-bv-border"></div></div>
        <div class="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-2">
            @for (card of cards; track card) {
                <div class="rounded-2xl border border-bv-border bg-bv-surface p-5 shadow-sm">
                    <div class="flex h-6 items-center"><div class="h-4 w-28 rounded bg-bv-border"></div></div>
                    <ol class="mt-4 space-y-3">
                        @for (row of rows; track row) {
                            <li class="flex items-center gap-3">
                                <div class="h-10 w-10 shrink-0 rounded-lg bg-bv-surface-2"></div>
                                <div class="min-w-0 flex-1">
                                    <div class="flex h-5 items-center"><div class="h-3.5 w-1/2 rounded bg-bv-border"></div></div>
                                    <div class="flex h-4 items-center"><div class="h-3 w-1/3 rounded bg-bv-border"></div></div>
                                </div>
                            </li>
                        }
                    </ol>
                </div>
            }
        </div>
    `,
})
export class SkeletonStandingsComponent {
    protected readonly cards = [1, 2]
    protected readonly rows = [1, 2, 3]
}
