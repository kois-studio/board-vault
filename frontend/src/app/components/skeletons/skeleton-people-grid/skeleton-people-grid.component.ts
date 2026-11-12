import { Component, computed, input } from '@angular/core'

/**
 * A group's people while they load on the plan and record forms (#261): one tile per person the group already says it
 * has, in the size of the tiles that replace them, so the form does not grow or reorder when they come.
 */
@Component({
    selector: 'app-skeleton-people-grid',
    host: { class: 'block', 'aria-hidden': 'true', 'data-testid': 'people-grid-skeleton' },
    template: `
        <div class="grid grid-cols-1 gap-2 motion-safe:animate-pulse sm:grid-cols-2 lg:grid-cols-3">
            @for (tile of tiles(); track tile) {
                <div class="flex items-center gap-3 rounded-lg border border-bv-border p-3">
                    <div class="h-10 w-10 shrink-0 rounded-full bg-bv-surface-2"></div>
                    <div class="min-w-0 flex-1">
                        <div class="flex h-6 items-center"><div class="h-3.5 w-24 max-w-full rounded bg-bv-border"></div></div>
                        <div class="flex h-4 items-center"><div class="h-2.5 w-14 rounded bg-bv-border"></div></div>
                    </div>
                    <div class="h-5 w-5 shrink-0 rounded-full border border-bv-border"></div>
                </div>
            }
        </div>
    `,
})
export class SkeletonPeopleGridComponent {
    /** How many people the group has, as far as it is known; at least one tile and at most twelve. */
    readonly count = input(3)
    protected readonly tiles = computed(() => Array.from({ length: Math.min(Math.max(this.count(), 1), 12) }, (_, index) => index))
}
