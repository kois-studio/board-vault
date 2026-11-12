import { Component } from '@angular/core'
import { SkeletonSessionActionsComponent } from '../skeleton-session-actions/skeleton-session-actions.component'
import { SkeletonSessionBodyComponent } from '../skeleton-session-body/skeleton-session-body.component'

/**
 * A game night's page before the night itself arrives (#260): the way back to its group, the header card with its
 * date, title and counts, a row of buttons, and the body. In the sizes of `app-session-summary` and the page.
 */
@Component({
    imports: [SkeletonSessionActionsComponent, SkeletonSessionBodyComponent],
    selector: 'app-skeleton-session-page',
    host: { class: 'block motion-safe:animate-pulse', 'data-testid': 'session-page-skeleton' },
    template: `
        <div class="mb-5 flex h-5 items-center"><div class="h-3.5 w-32 rounded bg-bv-border"></div></div>
        <div class="rounded-lg border border-bv-border bg-bv-surface p-5 shadow-sm sm:p-6">
            <div class="flex gap-4 sm:gap-5">
                <div class="h-[82px] w-16 shrink-0 rounded-lg bg-bv-surface-2 sm:h-24 sm:w-20"></div>
                <div class="min-w-0 flex-1">
                    <div class="h-6 w-24 rounded-full bg-bv-surface-2"></div>
                    <div class="mt-2 flex h-8 items-center sm:h-9"><div class="h-6 w-56 max-w-full rounded bg-bv-border sm:h-7"></div></div>
                    <div class="mt-1 flex h-5 items-center"><div class="h-3.5 w-64 max-w-full rounded bg-bv-border"></div></div>
                    <div class="mt-3 flex h-5 items-center"><div class="h-3.5 w-full max-w-md rounded bg-bv-border"></div></div>
                </div>
            </div>
            <div class="mt-5 flex flex-wrap gap-x-6 gap-y-2">
                @for (stat of stats; track stat) {
                    <div class="flex h-5 items-center"><div class="h-3.5 w-20 rounded bg-bv-border"></div></div>
                }
            </div>
            <app-skeleton-session-actions [actions]="true" [nested]="true" />
        </div>
        <app-skeleton-session-body [nested]="true" />
    `,
})
export class SkeletonSessionPageComponent {
    protected readonly stats = [1, 2, 3, 4]
}
