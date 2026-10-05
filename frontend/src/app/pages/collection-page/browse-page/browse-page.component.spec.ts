import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../../api/api'
import type { CatalogueTagType, GameCompleteType } from '../../../api/api.types'
import { ToastService } from '../../../components/toast/toast.service'
import { DataService } from '../../../core/services/data.service'
import { BrowsePageComponent, parseBrowseFilters } from './browse-page.component'

const azul: GameCompleteType = {
    id: 1,
    imageUrl: 'https://example.test/azul.jpg',
    gameAvgDuration: 45,
    minPlayers: 2,
    maxPlayers: 4,
    titleTranslations: { en: 'Azul', es: 'Azul' },
}
const tags: Array<CatalogueTagType> = [
    { id: 2, name: 'Strategy', categoryName: 'Genre', gameCount: 12 },
    { id: 3, name: 'Trading', categoryName: 'Mechanic', gameCount: 4 },
]

async function setup(query: Record<string, string> = {}) {
    const api = {
        browseGamesNotOwnedByUser: vi.fn().mockReturnValue(of({ games: [azul], pagination: {} })),
        getCatalogueTags: vi.fn().mockReturnValue(of(tags)),
    }
    await TestBed.configureTestingModule({
        imports: [BrowsePageComponent],
        providers: [
            provideRouter([]),
            { provide: Api, useValue: api },
            { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            {
                provide: DataService,
                useValue: { currentUser: signal({ id: 7 }), userGroups: signal([]), userGames: signal([]), userWishlist: signal([]) },
            },
            { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
        ],
    }).compileComponents()

    const router = TestBed.inject(Router)
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true)
    const fixture = TestBed.createComponent(BrowsePageComponent)
    fixture.detectChanges()
    await fixture.whenStable()
    return { fixture, component: fixture.componentInstance, api, navigate }
}

describe('parseBrowseFilters', () => {
    it('reads valid filters from the URL', () => {
        expect(
            parseBrowseFilters(convertToParamMap({ players: '4', length: 'short', tags: '3,2,3', hideOwned: 'true', sort: 'newest' })),
        ).toEqual({
            players: 4,
            length: 'short',
            tags: [3, 2],
            hideOwned: true,
            sort: 'newest',
        })
    })

    it('drops values the API would reject', () => {
        expect(
            parseBrowseFilters(convertToParamMap({ players: '0', length: 'forever', tags: 'abc,-1', hideOwned: 'yes', sort: 'random' })),
        ).toEqual({
            players: null,
            length: null,
            tags: [],
            hideOwned: false,
            sort: 'title',
        })
    })
})

describe('BrowsePageComponent filters', () => {
    it('loads the page the URL describes', async () => {
        const { api } = await setup({ q: 'catan', players: '3', tags: '2' })

        expect(api.browseGamesNotOwnedByUser).toHaveBeenCalledWith(7, 'catan', 1, 20, {
            players: 3,
            length: null,
            tags: [2],
            hideOwned: false,
            sort: 'title',
        })
    })

    it('searches again from the first page and records the filter in the URL', async () => {
        const { fixture, component, api, navigate } = await setup()

        component.setLength('short')
        component.toggleTag(2)
        component.setHideOwned(true)

        expect(api.browseGamesNotOwnedByUser).toHaveBeenLastCalledWith(
            7,
            '',
            1,
            20,
            expect.objectContaining({ length: 'short', tags: [2], hideOwned: true }),
        )
        expect(navigate).toHaveBeenLastCalledWith(
            [],
            expect.objectContaining({
                replaceUrl: true,
                queryParamsHandling: 'merge',
                queryParams: expect.objectContaining({ length: 'short', tags: '2', hideOwned: 'true', sort: null }),
            }),
        )
        expect(component.activeFilterCount()).toBe(3)

        component.tagsOpen.set(true)
        fixture.detectChanges()
        expect(fixture.nativeElement.querySelector('[aria-label="Remove tag Strategy"]')).not.toBeNull()
        const strategy = Array.from(fixture.nativeElement.querySelectorAll('button[aria-pressed]') as NodeListOf<HTMLButtonElement>).find(
            (button) => button.textContent?.includes('Strategy'),
        )
        expect(strategy?.getAttribute('aria-pressed')).toBe('true')
    })

    it('clears every filter but keeps the sort order', async () => {
        const { component } = await setup({ players: '4', sort: 'shortest', hideOwned: 'true' })

        component.clearFilters()

        expect(component.filters$()).toEqual({ players: null, length: null, tags: [], hideOwned: false, sort: 'shortest' })
        expect(component.activeFilterCount()).toBe(0)
    })

    it('offers to clear the filters when nothing matches', async () => {
        const { fixture, api, component } = await setup({ length: 'epic' })
        api.browseGamesNotOwnedByUser.mockReturnValue(of({ games: [], pagination: {} }))

        component.setPlayers('9')
        fixture.detectChanges()

        expect(fixture.nativeElement.textContent).toContain('No games match these filters')
        expect(fixture.nativeElement.textContent).toContain('Clear filters')
    })
})
