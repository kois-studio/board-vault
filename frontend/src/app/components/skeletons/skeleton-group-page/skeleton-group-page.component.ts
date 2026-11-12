import { Component } from '@angular/core'
import { SkeletonLibraryComponent } from '../skeleton-library/skeleton-library.component'
import { SkeletonRecentSessionsComponent } from '../skeleton-recent-sessions/skeleton-recent-sessions.component'

/**
 * The group page while your groups load (#260): the group switcher, the next game night and the group's numbers,
 * the section links, recent game nights and the library, in the grid and sizes of the page.
 */
@Component({
    imports: [SkeletonRecentSessionsComponent, SkeletonLibraryComponent],
    selector: 'app-skeleton-group-page',
    host: { class: 'block motion-safe:animate-pulse', 'data-testid': 'group-page-skeleton' },
    template: `
        <div class="flex flex-col space-y-8 py-6">
            <div class="flex flex-col gap-3 rounded-2xl border border-bv-border bg-bv-surface p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
                <div>
                    <div class="flex h-4 items-center"><div class="h-3 w-28 rounded bg-bv-border"></div></div>
                    <div class="mt-1 flex h-5 items-center"><div class="h-3.5 w-72 max-w-full rounded bg-bv-border"></div></div>
                </div>
                <div class="flex flex-wrap items-center gap-3">
                    <div class="h-11 w-48 rounded-xl bg-bv-surface-2"></div>
                    <div class="h-[42px] w-28 rounded-lg bg-bv-surface-2"></div>
                </div>
            </div>

            <div class="grid grid-cols-1 gap-4 lg:grid-cols-3">
                <div class="rounded-2xl bg-bv-primary p-6 shadow-lg lg:col-span-2">
                    <div class="flex h-5 items-center"><div class="h-3 w-32 rounded bg-bv-on-primary/25"></div></div>
                    <div class="mt-3 flex h-9 items-center"><div class="h-7 w-64 max-w-full rounded bg-bv-on-primary/25"></div></div>
                    <div class="mt-2 flex h-6 items-center"><div class="h-4 w-48 max-w-full rounded bg-bv-on-primary/25"></div></div>
                </div>
                <div class="rounded-2xl border border-bv-border bg-bv-surface p-6 shadow-sm">
                    <div class="flex h-5 items-center"><div class="h-3 w-28 rounded bg-bv-border"></div></div>
                    <div class="mt-5 grid grid-cols-3 gap-3">
                        @for (count of counts; track count) {
                            <div class="h-[76px] rounded-xl bg-bv-bg"></div>
                        }
                    </div>
                    <div class="mt-5 flex h-5 items-center"><div class="h-3.5 w-48 max-w-full rounded bg-bv-border"></div></div>
                </div>
            </div>

            <div class="rounded-2xl border border-bv-border bg-bv-surface p-2 shadow-sm">
                <div class="flex gap-2 overflow-hidden">
                    @for (link of links; track link) {
                        <div class="h-9 w-20 shrink-0 rounded-xl bg-bv-surface-2"></div>
                    }
                </div>
            </div>

            <div>
                <div class="mt-1 flex h-8 items-center"><div class="h-6 w-48 rounded bg-bv-border"></div></div>
                <div class="mt-1 flex h-6 items-center"><div class="h-4 w-64 max-w-full rounded bg-bv-border"></div></div>
                <app-skeleton-recent-sessions class="mt-5" [nested]="true" />
            </div>

            <div>
                <div class="mt-1 flex h-8 items-center"><div class="h-6 w-56 max-w-full rounded bg-bv-border"></div></div>
                <div class="mt-1 flex h-6 items-center"><div class="h-4 w-72 max-w-full rounded bg-bv-border"></div></div>
                <app-skeleton-library class="mt-5" [nested]="true" />
            </div>
        </div>
    `,
})
export class SkeletonGroupPageComponent {
    protected readonly counts = [1, 2, 3]
    protected readonly links = [1, 2, 3, 4, 5, 6]
}
