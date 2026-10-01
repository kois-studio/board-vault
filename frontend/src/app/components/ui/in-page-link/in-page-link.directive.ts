import { Location } from '@angular/common'
import { computed, Directive, DOCUMENT, HostListener, inject, input } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router } from '@angular/router'
import { filter, map } from 'rxjs'

/**
 * Links to an element on the current page: `<a appInPageLink="sessions">`.
 *
 * With `<base href="/">` a plain `href="#sessions"` resolves against the site root,
 * so the browser leaves the current route for `/#sessions` and reloads the app.
 * This directive keeps the link on the current path, scrolls to the target, moves
 * focus to it, and records the fragment in the URL without reloading.
 */
@Directive({
    selector: 'a[appInPageLink]',
    host: { '[attr.href]': 'href()' },
})
export class InPageLinkDirective {
    /** The id of the element to jump to. */
    readonly appInPageLink = input.required<string>()

    private readonly document = inject(DOCUMENT)
    private readonly location = inject(Location)
    private readonly router = inject(Router)

    private readonly path = toSignal(
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => this.location.path(false)),
        ),
        { initialValue: this.location.path(false) },
    )

    /** Full link target, so opening it in a new tab or copying it keeps the route. */
    readonly href = computed(() => this.location.prepareExternalUrl(`${this.path()}#${this.appInPageLink()}`))

    @HostListener('click', ['$event'])
    onClick(event: MouseEvent): void {
        // New-tab and new-window clicks use the full href as is.
        if (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return

        const target = this.document.getElementById(this.appInPageLink())
        if (!target) return

        event.preventDefault()
        target.scrollIntoView({ block: 'start' })

        // Move focus so keyboard and screen-reader users continue from the target.
        if (!target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
        target.focus({ preventScroll: true })

        this.location.replaceState(`${this.path()}#${this.appInPageLink()}`)
    }
}
