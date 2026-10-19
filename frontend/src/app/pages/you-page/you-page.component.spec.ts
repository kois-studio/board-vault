import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { type Observable, of, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType, HistoryRecordType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { YouPageComponent } from './you-page.component'

describe('YouPageComponent', () => {
    const game = (id: number, title: string): GameCompleteType => ({
        id,
        title,
        imageUrl: '',
        gameAvgDuration: 30,
        minPlayers: 2,
        maxPlayers: 4,
        titleTranslations: { en: title, es: title },
    })
    const me = { id: 1, username: 'ana', displayName: 'Ana Ruiz', avatar: null }
    const night = (
        id: number,
        status: string,
        games: Array<{ game: GameCompleteType; players: Array<number>; winners?: Array<number>; playCount?: number }>,
    ) =>
        ({
            meetData: { id, groupId: 10, status },
            attendedBy: [],
            gamesPlayed: games.map(({ game, players, winners, playCount }) => ({
                gameData: game,
                playCount,
                playedBy: players.map((id) => ({ id })),
                winnerAccountIds: winners,
            })),
        }) as unknown as HistoryRecordType
    const standing = (sessions: number, gamesPlayed: number, wins: number) => ({
        standings: [
            { accountId: 2, groupPersonId: null, displayName: 'Other', avatar: null, sessions: 9, gamesPlayed: 9, wins: 9 },
            { accountId: 1, groupPersonId: null, displayName: 'Ana Ruiz', avatar: null, sessions, gamesPlayed, wins },
        ],
    })

    const render = async ({ insights = {} as Record<number, Observable<unknown>>, paid = 0 } = {}) => {
        const groups = signal([
            { id: 10, name: 'Thursdays' },
            { id: 20, name: 'Family' },
            { id: 30, name: 'Office' },
        ])
        const api = { getGroupInsights: vi.fn((groupId: number) => insights[groupId] ?? of({ standings: [] })) }
        TestBed.configureTestingModule({
            imports: [YouPageComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: api },
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal(me),
                        userGroups: groups,
                        userGames: signal([game(1, 'Catan'), game(2, 'Azul')]),
                        userStats: signal({ totalGamesValue: paid }),
                        userReviews: signal([
                            { accountId: 1, gameId: 2, review: 6, reviewDate: '', gameData: game(2, 'Azul') },
                            { accountId: 1, gameId: 3, review: 10, reviewDate: '', gameData: game(3, 'Hanabi') },
                            { accountId: 1, gameId: 4, review: 0, reviewDate: '', gameData: game(4, 'Unrated') },
                        ]),
                        userHistory: signal([
                            night(1, 'completed', [
                                { game: game(1, 'Catan'), players: [1, 2], winners: [1] },
                                { game: game(2, 'Azul'), players: [1, 2], winners: [2], playCount: 2 },
                            ]),
                            night(2, 'completed', [
                                { game: game(2, 'Azul'), players: [1], winners: [1] },
                                { game: game(5, 'Not mine'), players: [2] },
                            ]),
                            night(3, 'active', [{ game: game(6, 'Still going'), players: [1] }]),
                        ]),
                    },
                },
            ],
        })
        const fixture = TestBed.createComponent(YouPageComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()
        return { element: fixture.nativeElement as HTMLElement, api, groups, fixture }
    }

    it('adds up your line in every group, the same numbers each group page shows', async () => {
        const { element, api } = await render({ insights: { 10: of(standing(4, 9, 3)), 20: of(standing(2, 3, 1)) } })
        const numbers = [...element.querySelectorAll('dl dd')].map((dd) => dd.textContent?.trim())

        expect(api.getGroupInsights).toHaveBeenCalledTimes(3)
        expect(numbers.slice(0, 4)).toEqual(['6', '12', '4', '2'])
        const rows = [...element.querySelectorAll('section[aria-labelledby="you-groups-heading"] li')].map((li) =>
            li.textContent?.replace(/\s+/g, ' ').trim(),
        )
        expect(rows[0]).toContain('Thursdays 4 nights · 9 games played · 3 wins')
        expect(rows[1]).toContain('Family 2 nights · 3 games played · 1 win')
        expect(rows[2]).toContain('Office No finished nights yet')
        expect(element.querySelector('a[href="/groups/10/members/1"]')).not.toBeNull()
    })

    it('says when a group could not be loaded and still counts the others', async () => {
        const { element } = await render({ insights: { 10: of(standing(4, 9, 3)), 20: throwError(() => new Error('down')) } })

        expect(element.textContent).toContain('Numbers could not be loaded')
        expect(element.querySelector('dl dd')?.textContent?.trim()).toBe('4')
    })

    it('ranks the games you played on finished nights, counting repeated plays and your wins', async () => {
        const { element } = await render()
        const played = [...element.querySelectorAll('section[aria-labelledby="you-played-heading"] li')].map((li) =>
            li.textContent?.replace('Artwork unavailable', '').replace(/\s+/g, ' ').trim(),
        )

        expect(played).toEqual(['Azul3 plays 1 win', 'Catan1 play 1 win'])
    })

    it('lists your highest rated games and ignores unrated ones', async () => {
        const { element } = await render()
        const rated = element.querySelector('section[aria-labelledby="you-rated-heading"]')

        expect(
            [...element.querySelectorAll('section[aria-labelledby="you-rated-heading"] li')].map((li) =>
                li.textContent?.includes('Hanabi') ? 'Hanabi' : 'Azul',
            ),
        ).toEqual(['Hanabi', 'Azul'])
        expect(rated?.textContent).toContain('2 games rated')
    })

    it('shows what you paid only when you entered prices', async () => {
        expect((await render()).element.textContent).not.toContain('paid')
        TestBed.resetTestingModule()
        expect((await render({ paid: 120 })).element.textContent).toContain('€120 paid')
    })

    it('loads a group that arrives after the page opened', async () => {
        const { api, groups, fixture } = await render()
        groups.update((all) => [...all, { id: 40, name: 'New' }])
        fixture.detectChanges()
        await fixture.whenStable()

        expect(api.getGroupInsights).toHaveBeenCalledTimes(4)
        expect(api.getGroupInsights).toHaveBeenLastCalledWith(40)
    })
})
