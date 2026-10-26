import { Component, computed, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { RecommendationCardComponent } from '../../components/recommendation-card/recommendation-card.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { InPageLinkDirective } from '../../components/ui/in-page-link/in-page-link.directive'
import { ReviewDisplayComponent } from '../../components/ui/review-display/review-display.component'
import { intlLocale } from '../../core/i18n/format'
import { PlayersPipe } from '../../core/pipes/count.pipe'
import {
    EXAMPLE_COVERS,
    EXAMPLE_GROUP,
    EXAMPLE_GROUP_SHELF,
    EXAMPLE_NIGHT,
    EXAMPLE_RATINGS,
    EXAMPLE_RECOMMENDATION,
    EXAMPLE_SEARCH,
    EXAMPLE_SHELF,
    EXAMPLE_WISH,
    type ExamplePerson,
} from './landing.fixtures'

/** The rotation of each cover in the row under the hero, from the cover set; odd ones also sit a little lower. */
const COVER_TILT = [-4, 2, 3, 2, -3, 1, -1, -2, -3, 4, -2, 2]

@Component({
    imports: [
        PlayersPipe,
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
    public readonly covers = EXAMPLE_COVERS.map((game, index) => ({
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
        going: { text: $localize`:Answer of someone coming to the landing example game night:Going`, tone: 'text-bv-success' },
        'no-answer': {
            text: $localize`:Someone has not answered yet, in the landing example game night:No answer`,
            tone: 'text-bv-warning',
        },
        'not-going': {
            text: $localize`:Answer of someone not coming to the landing example game night:Can’t come`,
            tone: 'text-bv-danger',
        },
    } as const

    /** "Owned by Ana and Mia", for screen readers on the example group's covers. */
    public ownedBy(owners: ReadonlyArray<ExamplePerson>): string {
        const names = new Intl.ListFormat(intlLocale(), { style: 'long', type: 'conjunction' }).format(owners.map((owner) => owner.name))
        return $localize`:Who owns a game in the landing example group; the placeholder is a list of names:Owned by ${names}:names:`
    }

    public readonly questions = [
        {
            q: $localize`:Question on the landing page:Is Board Vault free?`,
            a: $localize`:Answer on the landing page to Is Board Vault free?:Yes. Create an account and start adding games.`,
        },
        {
            q: $localize`:Question on the landing page:Do I need a group to use it?`,
            a: $localize`:Answer on the landing page to Do I need a group to use it?:No. Board Vault works as a personal collection manager on its own. Groups are there when you want to play with others.`,
        },
        {
            q: $localize`:Question on the landing page:Who can see my collection?`,
            a: $localize`:Answer on the landing page to Who can see my collection?:Only you, until you join a group. The people in your groups see the games you own and how you rated them, never your wishlist or your account.`,
        },
        {
            q: $localize`:Question on the landing page:Does it work on my phone?`,
            a: $localize`:Answer on the landing page to Does it work on my phone?:Yes. It runs in any modern browser and you can install it to your home screen.`,
        },
        {
            q: $localize`:Question on the landing page:Can friends without an account join in?`,
            a: $localize`:Answer on the landing page to Can friends without an account join in?:Yes. Add the people who come but never sign up, and keep their games and wins in the group’s history.`,
        },
        {
            q: $localize`:Question on the landing page:Is it open source?`,
            a: $localize`:Answer on the landing page to Is it open source?:Yes. The code is public on GitHub under the MIT license.`,
        },
    ]
}
