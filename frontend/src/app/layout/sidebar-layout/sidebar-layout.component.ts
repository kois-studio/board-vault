import { Component, DestroyRef, DOCUMENT, inject, input, OnInit, signal } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { ActivatedRoute, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { filter } from 'rxjs'
import { IconComponent } from '../../components/ui/icon/icon.component'

export type SidebarItem = {
    label: string
    icon: string
    /** Absolute route, for example `/settings/profile`. */
    link: string
    /** A count to show next to the label (for example pending proposals). Hidden when empty or zero. */
    badge?: number | null
    badgeLabel?: string
}

export type SidebarGroup = {
    /** Shown above the group; the first group usually has none. */
    label?: string
    items: Array<SidebarItem>
}

/** The `md` breakpoint: from here the sidebar and the section show side by side. */
const DESKTOP_QUERY = '(min-width: 768px)'

/**
 * A section area with its own navigation (Settings, Administration).
 * Desktop: sidebar and content side by side. Mobile: the sidebar is a list page at the
 * base route, and a section opens full width with a back link to the list.
 */
@Component({
    selector: 'app-sidebar-layout',
    imports: [RouterLink, RouterLinkActive, RouterOutlet, IconComponent],
    templateUrl: './sidebar-layout.component.html',
})
export class SidebarLayoutComponent implements OnInit {
    private readonly router = inject(Router)
    private readonly route = inject(ActivatedRoute)
    private readonly document = inject(DOCUMENT)
    private readonly destroyRef = inject(DestroyRef)

    readonly title = input.required<string>()
    /** The area's own route, for the mobile back link. */
    readonly basePath = input.required<string>()
    readonly groups = input.required<Array<SidebarGroup>>()

    /** True while a section is open in the outlet. */
    public readonly hasSection = signal(false)

    ngOnInit(): void {
        this.openFirstSectionOnDesktop()

        this.router.events
            .pipe(
                filter((event) => event instanceof NavigationEnd),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => this.openFirstSectionOnDesktop())
    }

    /** On desktop the list and a section show together, so the bare base route opens the first section. */
    private openFirstSectionOnDesktop(): void {
        if (this.route.firstChild || !this.document.defaultView?.matchMedia?.(DESKTOP_QUERY).matches) return

        const first = this.groups()[0]?.items[0]
        if (first) void this.router.navigateByUrl(first.link, { replaceUrl: true })
    }
}
