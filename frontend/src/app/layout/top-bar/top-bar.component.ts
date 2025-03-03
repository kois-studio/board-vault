import { Component } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
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
export class LayoutTopBarComponent {
    public readonly sections = [
        {
            id: 'dashboard',
            name: 'Dashboard',
            subsections: [
                { id: 'my-groups', name: 'My Groups' },
                { id: 'my-stats', name: 'My Stats' },
                { id: 'activity', name: 'Activity' },
                { id: 'analytics', name: 'Analytics' },
            ],
        },
        {
            id: 'collection',
            name: 'Collection',
            subsections: [
                { id: 'my-games', name: 'My Games' },
                { id: 'wishlist', name: 'Wishlist' },
                { id: 'reviews', name: 'Reviews' },
                { id: 'stats', name: 'Stats' },
            ],
        },
        {
            id: 'play',
            name: 'Play',
            subsections: [
                { id: 'upcoming-sessions', name: 'Upcoming Sessions' },
                { id: 'session-history', name: 'Session History' },
                { id: 'recommendations', name: 'Game Recommendations' },
                { id: 'quick-play', name: 'Quick Play & Stats' },
            ],
        },
    ]
}
