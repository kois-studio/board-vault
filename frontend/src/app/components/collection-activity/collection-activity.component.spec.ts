import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import type { CollectionActivityWithGameDataType, GameCompleteType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { CollectionActivityComponent } from './collection-activity.component'

const azul: GameCompleteType = {
    id: 7,
    imageUrl: '',
    gameAvgDuration: 30,
    minPlayers: 2,
    maxPlayers: 4,
    titleTranslations: { en: 'Azul', es: 'Azul' },
}

function activity(id: number, actionType: CollectionActivityWithGameDataType['actionType'], rating: number | null = null) {
    return {
        id,
        accountId: 1,
        gameId: azul.id,
        actionType,
        actionDetails: rating === null ? null : { rating },
        createdAt: new Date(Date.now() - id * 60_000).toISOString().replace('T', ' ').slice(0, 19),
        gameData: azul,
    } satisfies CollectionActivityWithGameDataType
}

async function setup(activities: CollectionActivityWithGameDataType[]) {
    await TestBed.configureTestingModule({
        imports: [CollectionActivityComponent],
        providers: [
            provideRouter([]),
            {
                provide: DataService,
                useValue: { userGames: signal([]), userWishlist: signal([]), userCollectionActivity: signal(activities) },
            },
        ],
    }).compileComponents()
    const fixture = TestBed.createComponent(CollectionActivityComponent)
    fixture.detectChanges()
    const lines = () =>
        [...fixture.nativeElement.querySelectorAll('li p.text-sm')].map((p: HTMLElement) => p.textContent?.replace(/\s+/g, ' ').trim())
    return { fixture, lines }
}

describe('CollectionActivityComponent', () => {
    it('writes one sentence per kind of change, with the title as a link', async () => {
        const { fixture, lines } = await setup([
            activity(1, 'added'),
            activity(2, 'removed'),
            activity(3, 'wishlisted'),
            activity(4, 'unwishlisted'),
            activity(5, 'updated'),
        ])

        expect(lines()).toEqual([
            'You added Azul to your collection',
            'You removed Azul from your collection',
            'You added Azul to your wishlist',
            'You removed Azul from your wishlist',
            'You updated Azul in your collection',
        ])
        const link = fixture.nativeElement.querySelector('li a') as HTMLAnchorElement
        expect(link.textContent?.trim()).toBe('Azul')
        expect(link.getAttribute('href')).toBe('/games/7')
    })

    it('marks a title in another language than the page’s', async () => {
        const baerenpark = { ...azul, title: 'Bärenpark', titleLanguage: 'de', titleTranslations: { de: 'Bärenpark' } }
        const { fixture } = await setup([{ ...activity(1, 'added'), gameData: baerenpark }, activity(2, 'added')])

        const [german, english] = fixture.nativeElement.querySelectorAll('li a') as NodeListOf<HTMLAnchorElement>
        expect(german?.getAttribute('lang')).toBe('de')
        expect(english?.hasAttribute('lang')).toBe(false)
    })

    it('uses the singular for one star and keeps half stars', async () => {
        const { lines } = await setup([activity(1, 'rated', 2), activity(2, 'rated', 7), activity(3, 'rated', 10)])

        expect(lines()).toEqual(['You rated Azul with 1 star', 'You rated Azul with 3.5 stars', 'You rated Azul with 5 stars'])
    })

    it('shows five changes until asked for all', async () => {
        const { fixture, lines } = await setup([1, 2, 3, 4, 5, 6].map((id) => activity(id, 'added')))

        expect(lines()).toHaveLength(5)
        const toggle = fixture.nativeElement.querySelector('button:not([aria-label])') as HTMLButtonElement
        expect(toggle.textContent?.trim()).toBe('View all activity')

        toggle.click()
        fixture.detectChanges()

        expect(lines()).toHaveLength(6)
        expect(toggle.textContent?.trim()).toBe('Show less')
    })
})
