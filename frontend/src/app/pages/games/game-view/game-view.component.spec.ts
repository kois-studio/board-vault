import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../../api/api'
import type { GameCompleteType, GameViewType, HistoryRecordType, PublicUserType } from '../../../api/api.types'
import { ToastService } from '../../../components/toast/toast.service'
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
        tags: [],
        wishlistedGameData: null,
        ratingData: { userRating: null, avgGroupsRating: null, avgGlobalRating: null },
        similarGames: [],
    }

    const setup = async () => {
        await TestBed.configureTestingModule({
            imports: [GameViewPageComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: { getGameView: vi.fn().mockReturnValue(of(view)) } },
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({ gameId: '18' })),
                        snapshot: { paramMap: convertToParamMap({ gameId: '18' }) },
                    },
                },
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal({ id: 1 }),
                        userGroups: signal([{ id: 7, name: 'DuckDevs', members: [], placeholders: [] }]),
                        userHistory: signal(history),
                        userGames: signal([]),
                        userWishlist: signal([]),
                    },
                },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(GameViewPageComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()
        return { fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement }
    }

    const listedNights = (element: HTMLElement) =>
        [...element.querySelectorAll('#game-plays a')].map((link) => Number(link.getAttribute('href')?.split('/').pop()))

    it('lists the nights the game was played, newest first, leaving out other games', async () => {
        const { component, element } = await setup()

        expect(component.userHistoryFilteredComputed().map((record) => record.meetData.id)).toEqual([40, 8, 2, 31, 22, 12, 10])
        expect(element.querySelector('#played-heading')?.textContent?.trim()).toBe('Played 7 times')
        expect(listedNights(element)).toEqual([40, 8, 2, 31, 22, 12])
    })

    it('shows every night once asked, and the latest again after', async () => {
        const { fixture, element } = await setup()
        const toggle = () => [...element.querySelectorAll('button')].find((button) => button.getAttribute('aria-controls') === 'game-plays')

        expect(toggle()?.textContent?.trim()).toBe('Show all 7 plays')
        expect(toggle()?.getAttribute('aria-expanded')).toBe('false')

        toggle()?.click()
        fixture.detectChanges()
        expect(listedNights(element)).toEqual([40, 8, 2, 31, 22, 12, 10])
        expect(toggle()?.getAttribute('aria-expanded')).toBe('true')

        toggle()?.click()
        fixture.detectChanges()
        expect(listedNights(element)).toHaveLength(6)
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
})
