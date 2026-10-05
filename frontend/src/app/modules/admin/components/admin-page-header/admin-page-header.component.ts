import { Component, input } from '@angular/core'

/** The header of every admin page: title, one line on what it is for, and the page's main action (projected). */
@Component({
    selector: 'app-admin-page-header',
    template: `
        <div class="mb-8 flex flex-wrap items-start justify-between gap-4">
            <div class="min-w-0">
                <h2 class="text-2xl font-bold tracking-wide">{{ title() }}</h2>
                <p class="mt-2 max-w-2xl text-bv-text-muted">{{ description() }}</p>
            </div>
            <ng-content />
        </div>
    `,
})
export class AdminPageHeaderComponent {
    readonly title = input.required<string>()
    readonly description = input.required<string>()
}
