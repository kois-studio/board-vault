import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { CollectionPageComponent } from './collection-page.component'

describe('CollectionPageComponent', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [CollectionPageComponent],
            providers: [
                {
                    provide: DataService,
                    useValue: {
                        userGames: signal([{ id: 1 }, { id: 2 }]),
                        userReviews: signal([{ id: 1 }]),
                        userWishlist: signal([{ id: 3 }]),
                        userCollectionActivity: signal([]),
                    },
                },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({ [LOADING_KEYS.USER_GAMES]: false }) } },
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
        expect(cards[0].textContent).toContain('2 games')
        expect(cards[2].textContent).toContain('1 review')
        expect(cards[2].textContent).not.toContain('1 reviews')
        expect(cards[3].textContent).toContain('1 game')
        expect(cards[3].textContent).not.toContain('1 games')
        expect(element.querySelector('app-collection-activity')).not.toBeNull()
    })
})
