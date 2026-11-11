import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { type ResourceStatus } from '../../core/async/resource-state'
import { stateOf } from '../../core/async/resource-state.testing'
import { DataService } from '../../core/services/data.service'
import { CollectionPageComponent } from './collection-page.component'

describe('CollectionPageComponent', () => {
    const status = {
        games: signal<ResourceStatus>('ready'),
        reviews: signal<ResourceStatus>('ready'),
        wishlist: signal<ResourceStatus>('ready'),
        activity: signal<ResourceStatus>('ready'),
    }

    beforeEach(async () => {
        for (const each of Object.values(status)) each.set('ready')
        const games = signal([{ id: 1 }, { id: 2 }])
        const reviews = signal([{ id: 1 }])
        const wishlist = signal([{ id: 3 }])
        const activity = signal([])
        await TestBed.configureTestingModule({
            imports: [CollectionPageComponent],
            providers: [
                {
                    provide: DataService,
                    useValue: {
                        userGames: games,
                        userGamesState: stateOf(games, status.games),
                        userReviews: reviews,
                        userReviewsState: stateOf(reviews, status.reviews),
                        userWishlist: wishlist,
                        userWishlistState: stateOf(wishlist, status.wishlist),
                        userCollectionActivity: activity,
                        userCollectionActivityState: stateOf(activity, status.activity),
                        refreshUserCollectionActivity: vi.fn(),
                    },
                },
                provideRouter([]),
            ],
        }).compileComponents()
    })

    it('links to every subpage with its count, then shows recent activity', () => {
        const fixture = TestBed.createComponent(CollectionPageComponent)
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement

        const cards = Array.from(element.querySelectorAll('app-card-section'))
        expect(cards.map((card) => card.getAttribute('cardlink'))).toEqual([
            '/collection/games',
            '/collection/browse',
            '/collection/reviews',
            '/collection/wishlist',
        ])
        expect(cards[0]?.textContent).toContain('2 games')
        expect(cards[2]?.textContent).toContain('1 review')
        expect(cards[2]?.textContent).not.toContain('1 reviews')
        expect(cards[3]?.textContent).toContain('1 game')
        expect(cards[3]?.textContent).not.toContain('1 games')
        expect(element.querySelector('app-collection-activity')).not.toBeNull()
    })

    // #256: a count is only shown once it has loaded.
    it('never counts 0 while a list loads or after it failed', () => {
        status.games.set('loading')
        status.reviews.set('error')
        const fixture = TestBed.createComponent(CollectionPageComponent)
        fixture.detectChanges()
        const cards = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('app-card-section'))

        expect(cards[0]?.textContent).toContain('Loading…')
        expect(cards[0]?.textContent).not.toContain('0 games')
        expect(cards[2]?.textContent).toContain('Unavailable')
        expect(cards[2]?.textContent).not.toMatch(/\d+ reviews?/)
    })

    it('keeps the count it had while a list refreshes', () => {
        status.games.set('refreshing')
        const fixture = TestBed.createComponent(CollectionPageComponent)
        fixture.detectChanges()

        expect((fixture.nativeElement as HTMLElement).querySelector('app-card-section')?.textContent).toContain('2 games')
    })
})
