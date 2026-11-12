import { Component } from '@angular/core'
import { ContainerWrapperComponent } from '../../ui/container-wrapper/container-wrapper.component'

/**
 * A game page while it loads (#261): the cover, the title, its facts, the two ratings, your stars and the collection
 * action, then who owns it and your plays, in the grid and sizes of the page, so nothing moves when it comes.
 */
@Component({
    selector: 'app-skeleton-game-page',
    imports: [ContainerWrapperComponent],
    host: { class: 'block', 'aria-hidden': 'true', 'data-testid': 'game-page-skeleton' },
    template: `
        <container-wrapper>
            <div class="space-y-12 pb-16 pt-6 motion-safe:animate-pulse">
                <div class="grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,320px)_1fr] lg:gap-12">
                    <div class="mx-auto aspect-square w-full max-w-xs rounded-2xl border border-bv-border bg-bv-surface p-3 shadow-sm md:max-w-none">
                        <div class="h-full w-full rounded-xl bg-bv-surface-2"></div>
                    </div>

                    <div class="min-w-0">
                        <div class="flex h-9 items-center md:h-10"><div class="h-7 w-2/3 rounded bg-bv-border md:h-8"></div></div>
                        <div class="mt-4 flex flex-wrap gap-2">
                            <div class="h-8 w-24 rounded-full bg-bv-surface-2"></div>
                            <div class="h-8 w-32 rounded-full bg-bv-surface-2"></div>
                        </div>
                        <div class="mt-6 grid grid-cols-2 gap-3 sm:max-w-md">
                            @for (rating of ratings; track rating) {
                                <div class="rounded-2xl border border-bv-border p-4">
                                    <div class="flex h-4 items-center"><div class="h-2.5 w-20 rounded bg-bv-border"></div></div>
                                    <div class="mt-1 flex h-8 items-center"><div class="h-6 w-24 rounded bg-bv-border"></div></div>
                                </div>
                            }
                        </div>
                        <div class="mt-4 flex h-8 items-center gap-3">
                            <div class="h-3.5 w-16 rounded bg-bv-border"></div>
                            <div class="flex gap-2">
                                @for (star of stars; track star) {
                                    <div class="h-6 w-6 rounded bg-bv-surface-2"></div>
                                }
                            </div>
                        </div>
                        <div class="mt-6 border-t border-bv-border pt-6">
                            <div class="h-[42px] w-44 rounded-lg bg-bv-surface-2"></div>
                        </div>
                    </div>
                </div>

                <div class="grid grid-cols-1 gap-8 lg:grid-cols-2">
                    @for (section of sections; track section) {
                        <div>
                            <div class="mb-3 flex h-7 items-center"><div class="h-5 w-40 rounded bg-bv-border"></div></div>
                            <div class="h-20 rounded-2xl bg-bv-surface-2"></div>
                        </div>
                    }
                </div>
            </div>
        </container-wrapper>
    `,
})
export class SkeletonGamePageComponent {
    protected readonly ratings = [1, 2]
    protected readonly stars = [1, 2, 3, 4, 5]
    protected readonly sections = [1, 2]
}
