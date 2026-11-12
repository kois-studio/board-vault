import { HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { NEVER, type Observable, of, throwError } from 'rxjs'
import { Api } from '../../../api/api'
import type { GameCompleteType, GameViewType, HistoryPageOptions, HistoryRecordType, PublicUserType } from '../../../api/api.types'
import { ToastService } from '../../../components/toast/toast.service'
import { type ResourceStatus } from '../../../core/async/resource-state'
import { withStates } from '../../../core/async/resource-state.testing'
import { ConnectivityService } from '../../../core/services/connectivity.service'
import { DataService } from '../../../core/services/data.service'
import { GameViewPageComponent } from './game-view.component'

describe('GameViewPageComponent plays', () => {
    const avatar = (emoji: string): PublicUserType['avatar'] => ({
        backgroundColor: '#000000',
        iconName: null,
        emoji,
        type: 'emoji',
        initials: '',
    })
    const game = (id: number, title: string): GameCompleteType =>
        ({
            id,
            title,
            titleTranslations: { en: title, es: title },
            imageUrl: '',
            gameAvgDuration: 15,
            minPlayers: 2,
            maxPlayers: 6,
        }) as GameCompleteType
    const loveLetter = game(18, 'Love Letter')
    const ana: PublicUserType = { id: 1, username: 'ana', displayName: 'Ana', avatar: avatar('🚀') }
    const ben: PublicUserType = { id: 6, username: 'ben', displayName: 'Ben', avatar: avatar('😎') }

    const night = (id: number, meetDate: string, gamesPlayed: HistoryRecordType['gamesPlayed']): HistoryRecordType => ({
        meetData: {
            id,
            groupId: 7,
            createdBy: 1,
            meetDate,
            isConfirmed: true,
            status: 'completed',
            timezone: 'Europe/Madrid',
            notes: null,
        },
        attendedBy: [],
        gamesPlayed,
    })

    // Out of order, as history arrives; night 40 was recorded with group people only, and night 41 is another game.
    const history: Array<HistoryRecordType> = [
        night(31, '2026-07-31T17:00:00.000Z', [{ gameData: loveLetter, playedBy: [ana], playedByPeople: [] }]),
        night(10, '2026-06-12T17:00:00.000Z', [{ gameData: loveLetter, playedBy: [ben], playedByPeople: [] }]),
        night(40, '2026-10-02T10:00:00.000Z', [
            {
                gameData: loveLetter,
                playedBy: [],
                playedByPeople: [
                    { id: 3, displayName: 'bloddsword', avatar: avatar('😎'), accountId: 6 },
                    { id: 9, displayName: 'Guest', avatar: null, accountId: null },
                ],
            },
        ]),
        night(12, '2026-07-12T17:00:00.000Z', [{ gameData: loveLetter, playedBy: [ana], playedByPeople: [] }]),
        night(22, '2026-07-22T17:00:00.000Z', [{ gameData: loveLetter, playedBy: [ana], playedByPeople: [] }]),
        night(41, '2026-10-03T10:00:00.000Z', [{ gameData: game(5, 'Azul'), playedBy: [ana], playedByPeople: [] }]),
        night(2, '2026-08-02T17:00:00.000Z', [
            {
                gameData: loveLetter,
                // Ben both ways, plus five more: six players once each.
                playedBy: [ana, ben],
                playedByPeople: [
                    { id: 3, displayName: 'bloddsword', avatar: avatar('😎'), accountId: 6 },
                    { id: 9, displayName: 'Guest', avatar: null, accountId: null },
                    { id: 10, displayName: 'Nora', avatar: null, accountId: null },
                    { id: 11, displayName: 'Pablo', avatar: null, accountId: null },
                    { id: 12, displayName: 'Lu', avatar: null, accountId: null },
                ],
            },
        ]),
        night(8, '2026-08-22T17:00:00.000Z', [{ gameData: loveLetter, playedBy: [ana], playedByPeople: [] }]),
    ]

    const view: GameViewType = {
        gameData: loveLetter,
        ownedGameData: null,
        editions: [],
        tags: [],
        wishlistedGameData: null,
        ratingData: { userRating: null, avgGroupsRating: null, avgGlobalRating: null },
        similarGames: [],
    }

    /** The server: the nights with the game, newest first, a page after the night given as `before` (#252). */
    const serverHistory = (_userId: number, options: HistoryPageOptions) => {
        const played = history
            .filter((record) => record.gamesPlayed.some((game) => game.gameData.id === options.gameId))
            .sort((a, b) => new Date(b.meetData.meetDate).getTime() - new Date(a.meetData.meetDate).getTime())
        const start = options.before === undefined ? 0 : played.findIndex((record) => record.meetData.id === options.before) + 1
        const limit = options.limit ?? 20
        return of({ entries: played.slice(start, start + limit), hasMore: start + limit < played.length })
    }
    const nightsWithGame = (_userId: number, filters: { gameId?: number }): Observable<unknown> =>
        of({
            nights: history.filter((record) => record.gamesPlayed.some((game) => game.gameData.id === filters.gameId)).length,
            gamesPlayed: 0,
            uniqueGames: 0,
            people: 0,
            mostPlayed: null,
            myMostPlayed: [],
        })

    const setup = async (
        getGameView = vi.fn().mockReturnValue(of(view)),
        beforeCreate = () => {},
        {
            getUserGamesHistory = vi.fn(serverHistory),
            getUserHistorySummary = vi.fn(nightsWithGame),
            groupsStatus = 'ready' as ResourceStatus,
        } = {},
    ) => {
        const toast = { success: vi.fn(), error: vi.fn() }
        const userHistoryRevision = signal(0)
        const refreshUserGroups = vi.fn()
        await TestBed.configureTestingModule({
            imports: [GameViewPageComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: { getGameView, getUserGamesHistory, getUserHistorySummary } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({ gameId: '18' })),
                        snapshot: { paramMap: convertToParamMap({ gameId: '18' }) },
                    },
                },
                {
                    provide: DataService,
                    useValue: withStates(
                        {
                            currentUser: signal({ id: 1 }),
                            userGroups: signal([{ id: 7, name: 'DuckDevs', members: [], placeholders: [] }]),
                            userHistoryRevision,
                            userGames: signal([]),
                            userWishlist: signal([]),
                            refreshUserGroups,
                        },
                        { userGroups: groupsStatus },
                    ),
                },
                { provide: ToastService, useValue: toast },
            ],
        }).compileComponents()

        beforeCreate()
        const fixture = TestBed.createComponent(GameViewPageComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()
        return {
            fixture,
            toast,
            component: fixture.componentInstance,
            element: fixture.nativeElement as HTMLElement,
            getUserGamesHistory,
            getUserHistorySummary,
            userHistoryRevision,
            refreshUserGroups,
        }
    }

    const listedNights = (element: HTMLElement) =>
        [...element.querySelectorAll('#game-plays a')].map((link) => Number(link.getAttribute('href')?.split('/').pop()))

    // #256: "nobody owns it" only once your groups have loaded.
    it('says nobody in your groups owns it only once your groups have loaded', async () => {
        const { element } = await setup()

        expect(element.querySelector('[aria-labelledby="owners-heading"]')?.textContent).toContain('Nobody in your groups owns it yet.')
    })

    it('does not say nobody owns it while your groups load', async () => {
        const { element } = await setup(undefined, undefined, { groupsStatus: 'loading' })
        const owners = element.querySelector('[aria-labelledby="owners-heading"]')

        expect(owners?.textContent).not.toContain('Nobody in your groups owns it yet.')
        expect(owners?.querySelector('app-async')?.getAttribute('aria-busy')).toBe('true')
    })

    it('says who owns it is unknown when your groups failed, with Retry', async () => {
        const { element, refreshUserGroups } = await setup(undefined, undefined, { groupsStatus: 'error' })
        const owners = element.querySelector('[aria-labelledby="owners-heading"]')

        expect(owners?.textContent).not.toContain('Nobody in your groups owns it yet.')
        expect(owners?.querySelector('[data-async="error"]')?.textContent).toContain(
            'Your groups could not be loaded, so who owns it is unknown.',
        )
        owners?.querySelector<HTMLButtonElement>('[data-async="error"] button')?.click()
        expect(refreshUserGroups).toHaveBeenCalledTimes(1)
    })

    it('asks the server for the latest nights with the game and how many there are in all (#252)', async () => {
        const { element, getUserGamesHistory, getUserHistorySummary } = await setup()

        expect(getUserGamesHistory).toHaveBeenCalledWith(1, { gameId: 18, before: undefined, limit: 6 })
        expect(getUserHistorySummary).toHaveBeenCalledWith(1, { gameId: 18 })
        expect(element.querySelector('#played-heading')?.textContent?.trim()).toBe('Played 7 times')
        expect(listedNights(element)).toEqual([40, 8, 2, 31, 22, 12])
    })

    it('reads older nights on request, after the last one shown', async () => {
        const { fixture, element, getUserGamesHistory } = await setup()
        const more = () => [...element.querySelectorAll('button')].find((button) => button.getAttribute('aria-controls') === 'game-plays')

        expect(more()?.textContent?.trim()).toBe('Show more plays')

        more()?.click()
        fixture.detectChanges()

        expect(getUserGamesHistory).toHaveBeenLastCalledWith(1, { gameId: 18, before: 12, limit: 20 })
        expect(listedNights(element)).toEqual([40, 8, 2, 31, 22, 12, 10])
        expect(more()).toBeUndefined()
    })

    it('counts the nights shown when the total does not load', async () => {
        const { element } = await setup(undefined, undefined, {
            getUserHistorySummary: vi.fn(() => throwError(() => new Error('offline'))),
        })

        expect(element.querySelector('#played-heading')?.textContent?.trim()).toBe('Played 6 times')
    })

    it('says when your plays could not load, and loads them on Try again', async () => {
        let fail = true
        const { fixture, element } = await setup(undefined, undefined, {
            getUserGamesHistory: vi.fn((userId: number, options: HistoryPageOptions) =>
                fail ? throwError(() => new Error('offline')) : serverHistory(userId, options),
            ),
        })
        const section = () => element.querySelector('section[aria-labelledby="played-heading"]') as HTMLElement

        expect(section().querySelector('[role="alert"]')?.textContent).toContain('Your plays could not be loaded.')

        fail = false
        section().querySelector('[role="alert"] button')?.dispatchEvent(new Event('click'))
        fixture.detectChanges()

        expect(listedNights(element)).toHaveLength(6)
    })

    it('keeps the plays on a heart, a rating or a profile edit, and reads them again when your history changes', async () => {
        const { fixture, component, getUserGamesHistory } = await setup()

        component.onWishlistChanged(true)
        fixture.detectChanges()
        expect(getUserGamesHistory).toHaveBeenCalledTimes(1)

        const edited = { id: 1, displayName: 'Ana B.' }
        TestBed.inject(DataService).currentUser.set(edited as never)
        fixture.detectChanges()
        expect(getUserGamesHistory).toHaveBeenCalledTimes(1)

        TestBed.inject(DataService).userHistoryRevision.set(1)
        fixture.detectChanges()
        expect(getUserGamesHistory).toHaveBeenCalledTimes(2)
    })

    it('shows the players of nights recorded with group people, each once', async () => {
        const { component, element } = await setup()
        const [wizardNight, , crowdedNight] = component.userHistoryFilteredComputed()

        expect(wizardNight?.players.map((player) => player.displayName)).toEqual(['bloddsword', 'Guest'])
        expect(crowdedNight?.players).toHaveLength(6)

        const rows = element.querySelectorAll('#game-plays li')
        expect(rows[0]?.querySelectorAll('app-image-profile')).toHaveLength(2)
        expect(rows[2]?.querySelectorAll('app-image-profile')).toHaveLength(5)
        expect(rows[2]?.textContent).toContain('+1')
    })

    describe('while Board Vault cannot be reached (#241)', () => {
        const unavailable = () => throwError(() => new HttpErrorResponse({ status: 503 }))

        it('says in place that the game could not load, with no toast, and loads it once Board Vault answers', async () => {
            const getGameView = vi.fn().mockReturnValueOnce(unavailable()).mockReturnValue(of(view))
            const { component, toast } = await setup(getGameView, () => TestBed.inject(ConnectivityService).reportUnreachable())

            expect(component.gameLoadError()).toBe(true)
            expect(toast.error).not.toHaveBeenCalled()

            TestBed.inject(ConnectivityService).reportAnswered()

            expect(component.gameLoadError()).toBe(false)
            expect(getGameView).toHaveBeenCalledTimes(2)
        })

        it('announces the failure as an alert with Retry (#248)', async () => {
            const { fixture } = await setup(vi.fn().mockReturnValue(unavailable()), () =>
                TestBed.inject(ConnectivityService).reportUnreachable(),
            )
            fixture.detectChanges()
            const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')

            expect(alert?.textContent).toContain('Game data could not be loaded.')
            expect(alert?.querySelector('button')?.textContent?.trim()).toBe('Retry')
        })

        it('still toasts when Board Vault is reachable', async () => {
            const { toast } = await setup(vi.fn().mockReturnValue(unavailable()))

            expect(toast.error).toHaveBeenCalledTimes(1)
        })

        it('does not load again a game that loaded', async () => {
            const getGameView = vi.fn().mockReturnValue(of(view))
            await setup(getGameView)

            TestBed.inject(ConnectivityService).retry()

            expect(getGameView).toHaveBeenCalledTimes(1)
        })
    })

    it('shows the page in its shape while the game loads, not a spinner (#261)', async () => {
        const { element } = await setup(vi.fn().mockReturnValue(NEVER))

        expect(element.querySelector('[data-testid="game-page-skeleton"]')).not.toBeNull()
        expect(element.querySelector('[role="status"]')?.textContent).toContain('Loading game data…')
        expect(element.querySelector('app-spinner')).toBeNull()
        expect(element.querySelector('#game-title')).toBeNull()
    })
})
