import { Component, OnInit, WritableSignal, computed, inject, signal } from '@angular/core'
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router'
import { filter } from 'rxjs/operators'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'

/**
 * Top bar - is like a second header under the main header
 * used to display user profile and other options
 */
@Component({
    imports: [RouterLink, RouterLinkActive, ContainerWrapperComponent],
    selector: 'app-layout-top-bar',
    templateUrl: 'top-bar.component.html',
})
export class LayoutTopBarComponent implements OnInit {
    private readonly router = inject(Router)

    // --------------------------------------------------------------------------
    //        Signals
    // --------------------------------------------------------------------------
    public readonly currentUrl$ = signal<string | null>(null)
    public readonly topBarModeComputed = computed(() => {
        // 0 -> shows sections, but no subsections
        // 1 -> shows sections[0] and its subsections (dashboard doesn't have any)
        // 2 -> shows sections[1] and its subsections
        // 3-> shows sections[2] and its subsections
        const currentUrl = this.currentUrl$()
        if (!currentUrl) {
            return 0
        }

        return (
            {
                '/dashboard': 0,
                '/collection': 0,
                '/collection/games': 2,
                '/collection/wishlist': 2,
                '/collection/reviews': 2,
                '/collection/stats': 2,
                '/play': 0,
                '/play/upcoming-sessions': 3,
                '/play/history': 3,
                '/play/recommendations': 3,
                '/play/quick-play': 3,
            }[currentUrl] ?? 0
        )
    })

    public readonly sections = [
        {
            path: 'dashboard',
            name: 'Dashboard',
        },
        {
            path: 'collection',
            name: 'Collection',
            subsections: [
                { path: 'collection/games', icon: 'grid-fill', name: 'My Games' },
                { path: 'collection/reviews', icon: 'star-fill', name: 'Reviews' },
                { path: 'collection/wishlist', icon: 'suit-heart-fill', name: 'Wishlist' },
                // { path: 'collection/stats', icon: 'bar-chart-fill', name: 'Stats' },
            ],
        },
        {
            path: 'play',
            name: 'Play',
            subsections: [
                // { path: 'play/upcoming-sessions', icon: 'calendar-check-fill', name: 'Upcoming' },
                { path: 'play/history', icon: 'clock-history', name: 'History' },
                // { path: 'play/recommendations', icon: 'hand-thumbs-up', name: 'Discover' },
                // { path: 'play/quick-play', icon: 'play-fill', name: 'Stats' },
            ],
        },
    ]

    ngOnInit() {
        // Initialize based on current route
        this.currentUrl$.set(this.router.url)

        // Update whenever navigation completes
        this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event: NavigationEnd) => {
            this.currentUrl$.set(event.url)
        })
    }
}
