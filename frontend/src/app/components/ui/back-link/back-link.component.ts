import { Component } from '@angular/core'
import { IconComponent } from '../icon/icon.component'

/**
 * The way back from a page, above its heading: an arrow and where it goes.
 * Every focused page (LayoutBasicComponent, which has no navigation) starts
 * with one, so there is always a way out that looks the same. It attaches to a
 * native `<a>`, so `routerLink` and `queryParams` work on it directly.
 *
 * @example
 * ```html
 * <a appBackLink [routerLink]="['/groups', groupId]" i18n="…">Back to the group</a>
 * ```
 */
@Component({
    selector: 'a[appBackLink]',
    imports: [IconComponent],
    // The label wraps rather than being cut short: it is a fixed text, and a longer translation still reads in full.
    template: `<app-icon name="arrow-left" [size]="16" className="shrink-0" aria-hidden="true" /><span class="min-w-0"><ng-content /></span>`,
    host: {
        class: 'inline-flex min-h-11 max-w-full items-center gap-2 rounded text-sm font-medium text-bv-text-muted hover:text-bv-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-bv-primary',
    },
})
export class BackLinkComponent {}
