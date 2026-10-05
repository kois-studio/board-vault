import { Component, input } from '@angular/core'
import { EXAMPLE_GROUP } from './landing.fixtures'

/**
 * Frames a live sample of the app on the landing page: dashed outline, an "Example" chip,
 * and a caption. The sample is `inert`, so it can't be focused or clicked; the caption
 * tells everyone (screen readers included) what they are looking at.
 */
@Component({
    selector: 'app-example-frame',
    template: `
        <figure class="relative rounded-2xl border-2 border-dashed border-bv-border bg-bv-bg/60 p-3 pt-9 sm:p-4 sm:pt-10">
            <span class="absolute left-3 top-2.5 rounded-full bg-bv-accent px-2.5 py-0.5 text-xs font-semibold text-bv-on-accent sm:left-4">Example · {{ group }}</span>
            <div inert class="select-none">
                <ng-content />
            </div>
            <figcaption class="mt-3 px-1 text-xs text-bv-text-muted">{{ caption() }}</figcaption>
        </figure>
    `,
})
export class ExampleFrameComponent {
    readonly caption = input('The real app, filled with a sample group.')
    public readonly group = EXAMPLE_GROUP
}
