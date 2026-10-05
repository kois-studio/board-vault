import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardGameComponent } from '../../components/card-game/card-game.component'
import { HistoryEntryComponent } from '../../components/history-entry/history-entry.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { RecommendationCardComponent } from '../../components/recommendation-card/recommendation-card.component'
import { SessionSummaryComponent } from '../../components/session-summary/session-summary.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ClerkService } from '../../core/services/clerk.service'
import { ExampleFrameComponent } from './example-frame.component'
import {
    EXAMPLE_GROUP,
    EXAMPLE_HISTORY,
    EXAMPLE_PEOPLE,
    EXAMPLE_RECOMMENDATIONS,
    EXAMPLE_SESSION,
    EXAMPLE_SHELF,
    EXAMPLE_SHORTLIST,
} from './landing.fixtures'

@Component({
    imports: [
        RouterLink,
        CardGameComponent,
        ExampleFrameComponent,
        HistoryEntryComponent,
        IconComponent,
        ImageProfileComponent,
        RecommendationCardComponent,
        SessionSummaryComponent,
    ],
    templateUrl: 'landing.component.html',
})
export class LandingComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly selfRegistrationEnabled = this.clerkService.isSelfRegistrationEnabled
    public readonly registrationCta = computed(() => (this.selfRegistrationEnabled() ? 'Create an account' : 'Get invited'))

    public readonly group = EXAMPLE_GROUP
    public readonly people = EXAMPLE_PEOPLE
    public readonly recommendations = EXAMPLE_RECOMMENDATIONS
    public readonly shelf = EXAMPLE_SHELF
    public readonly session = EXAMPLE_SESSION
    public readonly shortlist = EXAMPLE_SHORTLIST
    public readonly history = EXAMPLE_HISTORY

    public readonly rsvpLabels = {
        going: { text: 'Going', tone: 'bg-bv-success/15 text-bv-success', icon: 'thumbs-up' },
        'not-going': { text: 'Can’t make it', tone: 'bg-bv-danger/10 text-bv-danger', icon: 'thumbs-down' },
        'no-answer': { text: 'No answer yet', tone: 'bg-bv-surface-2 text-bv-text-muted', icon: 'clock' },
    } as const

    public readonly privacyPoints = [
        { icon: 'lock', title: 'Invite-only groups', text: 'A group is the people its owner invites. Nobody finds it by searching.' },
        {
            icon: 'bookmark',
            title: 'Your shelf stays yours',
            text: 'Your games and wishlist are private. Your groups only see what helps them decide.',
        },
        {
            icon: 'users',
            title: 'Friends without accounts count too',
            text: 'Add the people who come but never sign up, and keep their games and wins in the history.',
        },
        { icon: 'languages', title: 'English and Spanish titles', text: 'Search a game by either name: Catan or Los colonos de Catán.' },
        { icon: 'home', title: 'On your phone', text: 'Install it from the browser and it opens like an app at the table.' },
    ]

    public readonly questions = [
        {
            q: 'Who can join during the beta?',
            a: 'People invited by a friend who already uses Board Vault. Ask yours, or request access from the sign-up page.',
        },
        { q: 'Is it free?', a: 'Yes, during the private beta.' },
        { q: 'Does it work on phones?', a: 'Yes. It is built for game night at the table, and you can install it on your home screen.' },
        {
            q: 'Who sees my data?',
            a: 'The people in your groups see the games you own and your answers to their game nights. Your wishlist and account stay private.',
        },
    ]
}
