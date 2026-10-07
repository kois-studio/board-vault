import { Component, computed, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { RecommendationCardComponent } from '../../components/recommendation-card/recommendation-card.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { InPageLinkDirective } from '../../components/ui/in-page-link/in-page-link.directive'
import { ReviewDisplayComponent } from '../../components/ui/review-display/review-display.component'
import {
    EXAMPLE_GROUP,
    EXAMPLE_GROUP_SHELF,
    EXAMPLE_NIGHT,
    EXAMPLE_RATINGS,
    EXAMPLE_RECOMMENDATION,
    EXAMPLE_SEARCH,
    EXAMPLE_SHELF,
    EXAMPLE_WISH,
} from './landing.fixtures'

/** The rotation of each cover in the fan under the hero; odd ones also sit a little lower. */
const COVER_TILT = [-6, 3, -2, 5, -4, 2, -5, 4]

@Component({
    imports: [
        RouterLink,
        ButtonComponent,
        IconComponent,
        ImageProfileComponent,
        InPageLinkDirective,
        RecommendationCardComponent,
        ReviewDisplayComponent,
    ],
    templateUrl: 'landing.component.html',
})
export class LandingComponent {
    public readonly covers = EXAMPLE_SHELF.map((game, index) => ({
        ...game,
        transform: `rotate(${COVER_TILT[index % COVER_TILT.length]}deg)${index % 2 ? ' translateY(14px)' : ''}`,
    }))

    public readonly group = EXAMPLE_GROUP
    public readonly search = EXAMPLE_SEARCH
    public readonly ratings = EXAMPLE_RATINGS
    public readonly wish = EXAMPLE_WISH
    public readonly groupShelf = EXAMPLE_GROUP_SHELF
    public readonly recommendation = EXAMPLE_RECOMMENDATION
    public readonly night = EXAMPLE_NIGHT

    /** The "find" sample works: the chips filter the shelf the way the player filter on My games does. */
    public readonly playerFilters = [null, 2, 5, 6] as const
    public readonly players = signal<number | null>(null)
    public readonly shelf = computed(() => {
        const players = this.players()
        return EXAMPLE_SHELF.filter((game) => players === null || (game.minPlayers <= players && players <= game.maxPlayers))
    })

    public readonly rsvpLabels = {
        going: { text: 'Going', tone: 'text-bv-success' },
        'no-answer': { text: 'No answer', tone: 'text-bv-warning' },
        'not-going': { text: 'Can’t come', tone: 'text-bv-danger' },
    } as const

    public readonly questions = [
        { q: 'Is Board Vault free?', a: 'Yes. Create an account and start adding games.' },
        {
            q: 'Do I need a group to use it?',
            a: 'No. Board Vault works as a personal collection manager on its own. Groups are there when you want to play with others.',
        },
        {
            q: 'Who can see my collection?',
            a: 'Only you, until you join a group. The people in your groups see the games you own and how you rated them, never your wishlist or your account.',
        },
        { q: 'Does it work on my phone?', a: 'Yes. It runs in any modern browser and you can install it to your home screen.' },
        {
            q: 'Can friends without an account join in?',
            a: 'Yes. Add the people who come but never sign up, and keep their games and wins in the group’s history.',
        },
        { q: 'Is it open source?', a: 'Yes. The code is public on GitHub under the MIT license.' },
    ]
}
