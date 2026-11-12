import { Component, input } from '@angular/core'

/**
 * Inside a game night's header while its group loads (#260): the place of "Can you make it?" and of the row of
 * buttons, in their size, so nothing below moves when they come.
 */
@Component({
    selector: 'app-skeleton-session-actions',
    host: {
        class: 'block',
        '[class.motion-safe:animate-pulse]': '!nested()',
        'aria-hidden': 'true',
        'data-testid': 'session-actions-skeleton',
    },
    template: `
        @if (rsvp()) {
            <div class="mt-5 flex flex-wrap items-center gap-3 rounded-lg border border-bv-border p-4">
                <div class="mr-auto flex h-6 items-center"><div class="h-4 w-36 rounded bg-bv-border"></div></div>
                <div class="flex flex-wrap gap-2">
                    <div class="h-9 w-28 rounded-full bg-bv-surface-2"></div>
                    <div class="h-9 w-32 rounded-full bg-bv-surface-2"></div>
                </div>
            </div>
        }
        @if (actions()) {
            <div class="mt-5 flex flex-wrap items-center gap-3 border-t border-bv-border pt-5">
                <div class="h-[42px] w-44 rounded-lg bg-bv-surface-2"></div>
                <div class="h-[42px] w-36 rounded-lg bg-bv-surface-2"></div>
            </div>
            @if (hint()) {
                <div class="mt-3 flex h-5 items-center"><div class="h-3.5 w-full max-w-lg rounded bg-bv-border"></div></div>
            }
        }
    `,
})
export class SkeletonSessionActionsComponent {
    /** Inside another skeleton, which pulses for both. */
    readonly nested = input(false)
    /** "Can you make it?" is likely to show. */
    readonly rsvp = input(false)
    /** The row of buttons (start, add to calendar, …) is likely to show. */
    readonly actions = input(false)
    /** The line under the buttons of a planned night ("Start the night when…"). */
    readonly hint = input(false)
}
