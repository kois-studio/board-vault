import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
import { Api } from '../../../api/api'
import type { CatalogueTagType, GameCompleteType } from '../../../api/api.types'
import { ToastService } from '../../../components/toast/toast.service'
import { DataService } from '../../../core/services/data.service'
import { BrowsePageComponent, parseBrowseFilters } from './browse-page.component'
import { BrowsePageService } from './browse-page.service'

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

    it('names each game’s collection button and each chosen tag by what it does', async () => {
        const { component } = await setup()

        expect(component.collectionLabel(azul)).toBe('Add Azul to your collection')
        expect(component.collectionLabel({ ...azul, isInCollection: true })).toBe('Azul is already in your collection')
        expect(component.removeTagLabel('Strategy')).toBe('Remove tag Strategy')

        // Just added: the button already reads "In your games", so its name must agree.
        component.collectionState.set({ [azul.id]: 'saved' })
        expect(component.collectionLabel(azul)).toBe('Azul is already in your collection')
    })
})

describe('BrowsePageComponent next page (#244)', () => {
    type BrowseAnswer = { games: Array<GameCompleteType>; pagination: object }
    /** A page of games with ids from `first`; a full page (20) means more may follow. */
    const gamesFrom = (first: number, count = 20): BrowseAnswer => ({
        games: Array.from({ length: count }, (_, index) => ({
            ...azul,
            id: first + index,
            titleTranslations: { en: `Game ${first + index}`, es: `Juego ${first + index}` },
        })),
        pagination: {},
    })
    const down = () => throwError(() => new Error('Board Vault did not answer'))

    async function setupFullPage() {
        const context = await setup()
        context.api.browseGamesNotOwnedByUser.mockReturnValue(of(gamesFrom(1)))
        context.component.setSort('newest')
        context.fixture.detectChanges()
        await context.fixture.whenStable()
        context.fixture.detectChanges()
        const element = context.fixture.nativeElement as HTMLElement
        const byTestId = (id: string) => element.querySelector<HTMLElement>(`[data-testid="${id}"]`)
        const gameLinks = () => element.querySelectorAll<HTMLElement>('[data-testid="browse-games"] > div > a')
        return { ...context, element, byTestId, gameLinks }
    }

    async function failNextPage() {
        const context = await setupFullPage()
        context.api.browseGamesNotOwnedByUser.mockReturnValue(down())
        context.byTestId('load-more')?.click()
        context.fixture.detectChanges()
        return context
    }

    it('asks for the next page and only moves on once it arrives', async () => {
        const { fixture, component, api, byTestId } = await setupFullPage()
        const next = new Subject<BrowseAnswer>()
        api.browseGamesNotOwnedByUser.mockReturnValue(next)

        byTestId('load-more')?.click()
        expect(api.browseGamesNotOwnedByUser).toHaveBeenLastCalledWith(7, '', 2, 20, expect.anything())
        expect(component.currentPage$()).toBe(1)

        next.next(gamesFrom(21))
        next.complete()
        fixture.detectChanges()
        expect(component.currentPage$()).toBe(2)
        expect(component.browseGamesList$()).toHaveLength(40)
        expect(component.hasMoreGames$()).toBe(true)
    })

    it('keeps the games shown when the next page fails, and says so under them', async () => {
        const { component, element, byTestId, gameLinks } = await failNextPage()

        expect(gameLinks()).toHaveLength(20)
        expect(component.currentPage$()).toBe(1)
        expect(component.searchError()).toBe(false)
        expect(byTestId('load-more-error')?.getAttribute('role')).toBe('alert')
        expect(element.textContent).toContain('We couldn’t load more games.')
        expect(element.textContent).not.toContain('We couldn’t load games right now.')
        expect(byTestId('load-more')).toBeNull()
        // The message sits after the games.
        const grid = byTestId('browse-games') as HTMLElement
        expect(grid.compareDocumentPosition(byTestId('load-more-error') as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('asks again for the page that failed only, and adds its games', async () => {
        const { fixture, component, api, byTestId, gameLinks } = await failNextPage()
        api.browseGamesNotOwnedByUser.mockReturnValue(of(gamesFrom(21)))

        byTestId('load-more-retry')?.click()
        fixture.detectChanges()

        expect(api.browseGamesNotOwnedByUser).toHaveBeenLastCalledWith(7, '', 2, 20, expect.anything())
        expect(gameLinks()).toHaveLength(40)
        expect(component.currentPage$()).toBe(2)
        expect(byTestId('load-more-error')).toBeNull()
        expect(byTestId('load-more')).not.toBeNull()
    })

    it('keeps the message, busy, while the page loads again, and ignores a second press', async () => {
        const { fixture, api, byTestId, gameLinks } = await failNextPage()
        const retried = new Subject<BrowseAnswer>()
        api.browseGamesNotOwnedByUser.mockReturnValue(retried)
        const calls = api.browseGamesNotOwnedByUser.mock.calls.length

        byTestId('load-more-retry')?.click()
        fixture.detectChanges()
        expect(byTestId('load-more-error')).not.toBeNull()
        expect(byTestId('load-more-retry')?.getAttribute('aria-busy')).toBe('true')
        expect(gameLinks()).toHaveLength(20)
        byTestId('load-more-retry')?.click()
        expect(api.browseGamesNotOwnedByUser.mock.calls.length).toBe(calls + 1)
    })

    it('says so again when the page fails a second time', async () => {
        const { fixture, component, byTestId, gameLinks } = await failNextPage()

        byTestId('load-more-retry')?.click()
        fixture.detectChanges()

        expect(byTestId('load-more-error')).not.toBeNull()
        expect(byTestId('load-more-retry')?.getAttribute('aria-busy')).toBeNull()
        expect(gameLinks()).toHaveLength(20)
        expect(component.currentPage$()).toBe(1)
    })

    it('moves focus to the first new game after Try again works', async () => {
        const { fixture, api, byTestId, gameLinks } = await failNextPage()
        api.browseGamesNotOwnedByUser.mockReturnValue(of(gamesFrom(21)))

        byTestId('load-more-retry')?.click()
        fixture.detectChanges()
        await fixture.whenStable()

        expect(document.activeElement).toBe(gameLinks()[20])
    })

    it('leaves focus alone when it was moved while the page loaded again', async () => {
        const { fixture, api, byTestId, gameLinks } = await failNextPage()
        const retried = new Subject<BrowseAnswer>()
        api.browseGamesNotOwnedByUser.mockReturnValue(retried)
        byTestId('load-more-retry')?.click()
        gameLinks()[3]?.focus()

        retried.next(gamesFrom(21))
        retried.complete()
        fixture.detectChanges()
        await fixture.whenStable()

        expect(document.activeElement).toBe(gameLinks()[3])
    })

    it('does not move focus after an ordinary Load More', async () => {
        const { fixture, api, byTestId } = await setupFullPage()
        api.browseGamesNotOwnedByUser.mockReturnValue(of(gamesFrom(21)))

        byTestId('load-more')?.click()
        fixture.detectChanges()
        await fixture.whenStable()

        expect(document.activeElement).toBe(document.body)
    })

    it('forgets the failed page when a new search starts', async () => {
        const { fixture, component, api, byTestId } = await failNextPage()
        api.browseGamesNotOwnedByUser.mockReturnValue(of(gamesFrom(100, 3)))

        component.setPlayers('4')
        fixture.detectChanges()

        expect(api.browseGamesNotOwnedByUser).toHaveBeenLastCalledWith(7, '', 1, 20, expect.objectContaining({ players: 4 }))
        expect(byTestId('load-more-error')).toBeNull()
        expect(component.currentPage$()).toBe(1)
        expect(component.browseGamesList$()).toHaveLength(3)
    })

    it('still empties the list for a failed first page, with its own Try again', async () => {
        const { fixture, component, api, element, byTestId } = await setupFullPage()
        api.browseGamesNotOwnedByUser.mockReturnValue(down())

        component.setPlayers('4')
        fixture.detectChanges()

        expect(component.searchError()).toBe(true)
        expect(byTestId('load-more-error')).toBeNull()
        expect(element.textContent).toContain('We couldn’t load games right now.')
        expect(byTestId('browse-games')).toBeNull()
    })

    it('moves focus to the last game when the page asked for again comes back empty', async () => {
        const { fixture, api, byTestId, gameLinks } = await failNextPage()
        api.browseGamesNotOwnedByUser.mockReturnValue(of(gamesFrom(21, 0)))

        byTestId('load-more-retry')?.click()
        fixture.detectChanges()
        await fixture.whenStable()

        expect(byTestId('load-more')).toBeNull()
        expect(document.activeElement).toBe(gameLinks()[19])
    })

    it('drops a next page still on its way when the search becomes too short', async () => {
        const { fixture, component, api, byTestId } = await setupFullPage()
        const next = new Subject<BrowseAnswer>()
        api.browseGamesNotOwnedByUser.mockReturnValue(next)
        byTestId('load-more')?.click()

        component.searchControl.setValue('a')
        await new Promise((resolve) => setTimeout(resolve, 600))
        expect(component.isSearching$()).toBe(false)
        next.next(gamesFrom(21))
        next.complete()
        fixture.detectChanges()

        expect(component.browseGamesList$()).toEqual([])
        expect(component.currentPage$()).toBe(1)
        expect(component.loadMoreError()).toBe(false)
    })

    it('drops a next page still on its way when the page is left', async () => {
        const { fixture, api, byTestId } = await setupFullPage()
        const next = new Subject<BrowseAnswer>()
        api.browseGamesNotOwnedByUser.mockReturnValue(next)
        byTestId('load-more')?.click()
        const service = TestBed.inject(BrowsePageService)

        fixture.destroy()
        expect(service.isSearching()).toBe(false)
        next.next(gamesFrom(21))

        expect(service.browseGamesList()).toHaveLength(20)
        expect(service.currentPage()).toBe(1)
    })
})
