import { Component, input } from '@angular/core'

/** A group's library while the group loads (#260): game cards in the grid and size of the group page. */
@Component({
    selector: 'app-skeleton-library',
    host: { class: 'block', '[class.motion-safe:animate-pulse]': '!nested()', 'aria-hidden': 'true', 'data-testid': 'library-skeleton' },
    template: `
        <div class="grid grid-cols-1 gap-4 md:grid-cols-2">
            @for (card of cards; track card) {
                <div class="flex min-w-0 gap-4 rounded-2xl border border-bv-border bg-bv-surface p-3">
                    <div class="h-24 w-24 shrink-0 rounded-xl bg-bv-surface-2"></div>
                    <div class="min-w-0 flex-1">
                        <div class="flex h-6 items-center"><div class="h-4 w-2/3 rounded bg-bv-border"></div></div>
                        <div class="mt-2 flex h-5 items-center"><div class="h-3 w-1/3 rounded bg-bv-border"></div></div>
                        <div class="mt-3 flex gap-2">
                            <div class="h-6 w-16 rounded-full bg-bv-surface-2"></div>
                            <div class="h-6 w-16 rounded-full bg-bv-surface-2"></div>
                        </div>
                    </div>
                </div>
            }
        </div>
    `,
})
export class SkeletonLibraryComponent {
    /** Inside another skeleton, which pulses for both. */
    readonly nested = input(false)
    protected readonly cards = [1, 2, 3, 4]
}
