import { Component, computed, inject, OnInit, signal } from '@angular/core'
import { NavigationEnd, Router, RouterLink } from '@angular/router'
import { filter } from 'rxjs/operators'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { IconComponent } from '../../components/ui/icon/icon.component'

type Section = {
    path: string
    name: string
    /** URL prefixes that belong to this section (besides its own path). */
    owns: Array<string>
    subsections?: Array<{ path: string; icon: string; name: string }>
}

/**
 * The three main sections, under the header. Settings lives in the profile
 * menu, not here.
 */
@Component({
    imports: [RouterLink, ContainerWrapperComponent, IconComponent],
    selector: 'app-layout-top-bar',
    templateUrl: 'top-bar.component.html',
})
export class LayoutTopBarComponent implements OnInit {
    public readonly router = inject(Router)

    public readonly sections: Array<Section> = [
        {
            path: 'dashboard',
            name: 'Home',
            // Groups and everything inside them live under Home.
            owns: ['/groups'],
        },
        {
            path: 'collection',
            name: 'Collection',
            owns: ['/games'],
            subsections: [
                { path: 'collection/games', icon: 'collection-fill', name: 'My Games' },
                { path: 'collection/browse', icon: 'search', name: 'Browse' },
                { path: 'collection/reviews', icon: 'star-fill', name: 'Reviews' },
                { path: 'collection/wishlist', icon: 'suit-heart-fill', name: 'Wishlist' },
            ],
        },
        {
            path: 'play',
            name: 'Play',
            owns: ['/sessions', '/meets'],
            subsections: [
                { path: 'play/upcoming-sessions', icon: 'calendar-clock', name: 'Upcoming' },
                { path: 'play/recommendations', icon: 'lightbulb', name: 'What to play' },
                { path: 'play/history', icon: 'history', name: 'History' },
            ],
        },
    ]

    public readonly currentUrl$ = signal<string>('')
    public readonly activeSection = computed(() => {
        const url = this.currentUrl$().split(/[?#]/)[0] ?? ''
        const matches = (prefix: string) => url === prefix || url.startsWith(`${prefix}/`)
        return this.sections.find((section) => matches(`/${section.path}`) || section.owns.some(matches)) ?? null
    })

    public isSubsectionActive(path: string): boolean {
        const url = this.currentUrl$().split(/[?#]/)[0] ?? ''
        return url === `/${path}` || url.startsWith(`/${path}/`)
    }

    ngOnInit() {
        this.currentUrl$.set(this.router.url)
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
            this.currentUrl$.set(event.urlAfterRedirects)
        })
    }
}
