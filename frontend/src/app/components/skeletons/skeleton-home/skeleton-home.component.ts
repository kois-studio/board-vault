import { Component, input } from '@angular/core'
import { SkeletonCardGroupComponent } from '../skeleton-card-group/skeleton-card-group.component'

/**
 * Home while it loads, in Home's shape (#261, #343): two group cards and recent nights. With `withHeader`, also the
 * greeting and the two buttons, for the moment the account itself is not known yet (`<app-account-pending>` on
 * `/dashboard`). The same skeleton then stays until Home's content replaces it: one loading screen, not two.
 */
@Component({
    selector: 'app-skeleton-home',
    imports: [SkeletonCardGroupComponent],
    host: { class: 'block' },
    template: `
        @if (withHeader()) {
            <div class="flex flex-wrap items-center justify-between gap-4" aria-hidden="true" data-testid="home-header-skeleton">
                <div class="flex h-8 items-center lg:h-9"><div class="h-6 w-56 max-w-full rounded-lg bg-bv-surface-2 motion-safe:animate-pulse lg:h-7"></div></div>
                <div class="grid w-full grid-cols-2 gap-2 motion-safe:animate-pulse sm:flex sm:w-auto">
                    <div class="h-[42px] rounded-lg bg-bv-surface-2 sm:w-44"></div>
                    <div class="h-[42px] rounded-lg bg-bv-surface-2 sm:w-44"></div>
                </div>
            </div>
        }
        <div [class.mt-8]="withHeader()" class="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start" aria-hidden="true" data-testid="home-body-skeleton">
            <div class="min-w-0">
                <div class="mb-3 flex h-7 items-center"><div class="h-4 w-28 rounded bg-bv-border motion-safe:animate-pulse"></div></div>
                <div class="space-y-4">
                    @for (card of cards; track card) {
                        <app-skeleton-card-group />
                    }
                </div>
            </div>
            <div class="min-w-0 motion-safe:animate-pulse">
                <div class="mb-3 flex h-7 items-center"><div class="h-4 w-32 rounded bg-bv-border"></div></div>
                <div class="divide-y divide-bv-border rounded-2xl border border-bv-border bg-bv-surface">
                    @for (row of rows; track row) {
                        <div class="flex items-center gap-3 p-3">
                            <span class="h-11 w-11 shrink-0 rounded-lg bg-bv-surface-2"></span>
                            <span class="min-w-0 flex-1 space-y-2">
                                <span class="block h-4 w-2/3 rounded bg-bv-surface-2"></span>
                                <span class="block h-3 w-1/2 rounded bg-bv-surface-2"></span>
                            </span>
                        </div>
                    }
                </div>
            </div>
        </div>
    `,
})
export class SkeletonHomeComponent {
    readonly withHeader = input(false)
    protected readonly cards = [1, 2]
    protected readonly rows = [1, 2]
}
