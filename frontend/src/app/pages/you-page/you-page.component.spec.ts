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

    type Failed = Partial<Record<'groups' | 'games' | 'stats' | 'history' | 'reviews', boolean>>
    const render = async ({ insights = {} as Record<number, Observable<unknown>>, paid = 0, failed = {} as Failed } = {}) => {
        const groups = signal(
            failed.groups
                ? []
                : [
                      { id: 10, name: 'Thursdays' },
                      { id: 20, name: 'Family' },
                      { id: 30, name: 'Office' },
                  ],
        )
        const errors = {
            userGroupsError: signal(Boolean(failed.groups)),
            userGamesError: signal(Boolean(failed.games)),
            userStatsError: signal(Boolean(failed.stats)),
            userHistoryError: signal(Boolean(failed.history)),
            userReviewsError: signal(Boolean(failed.reviews)),
        }
        const refresh = {
            refreshUserGroups: vi.fn(),
            refreshUserGames: vi.fn(),
            refreshUserStats: vi.fn(),
            refreshUserHistory: vi.fn(),
            refreshGameReviews: vi.fn(),
        }
        const api = { getGroupInsights: vi.fn((groupId: number) => insights[groupId] ?? of({ standings: [] })) }
        TestBed.configureTestingModule({
            imports: [YouPageComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: api },
                {
                    provide: DataService,
                    useValue: {
                        ...refresh,
                        ...errors,
                        currentUser: signal(me),
                        userGroups: groups,
                        userGames: signal(failed.games ? [] : [game(1, 'Catan'), game(2, 'Azul')]),
                        userStats: signal({ totalGamesValue: paid }),
                        userReviews: signal(
                            failed.reviews
                                ? []
                                : [
                                      { accountId: 1, gameId: 2, review: 6, reviewDate: '', gameData: game(2, 'Azul') },
                                      { accountId: 1, gameId: 3, review: 10, reviewDate: '', gameData: game(3, 'Hanabi') },
                                      { accountId: 1, gameId: 4, review: 0, reviewDate: '', gameData: game(4, 'Unrated') },
                                  ],
                        ),
                        userHistory: signal(
                            failed.history
                                ? []
                                : [
                                      night(1, 'completed', [
                                          { game: game(1, 'Catan'), players: [1, 2], winners: [1] },
                                          { game: game(2, 'Azul'), players: [1, 2], winners: [2], playCount: 2 },
                                      ]),
                                      night(2, 'completed', [
                                          { game: game(2, 'Azul'), players: [1], winners: [1] },
                                          { game: game(5, 'Not mine'), players: [2] },
                                      ]),
                                      night(3, 'active', [{ game: game(6, 'Still going'), players: [1] }]),
                                  ],
                        ),
                    },
                },
            ],
        })
        const fixture = TestBed.createComponent(YouPageComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()
        return { element: fixture.nativeElement as HTMLElement, api, groups, fixture, refresh, errors }
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

    it('says when a group could not be loaded, and shows the totals as missing instead of too low', async () => {
        const { element } = await render({ insights: { 10: of(standing(4, 9, 3)), 20: throwError(() => new Error('down')) } })
        const numbers = [...element.querySelectorAll('dl dd')].map((dd) => dd.textContent?.trim())

        expect(element.textContent).toContain('Numbers could not be loaded')
        expect(numbers.slice(0, 4)).toEqual(['—Not loaded', '—Not loaded', '—Not loaded', '2'])
        expect(element.querySelector('[role="alert"]')?.textContent).toContain('Some of your numbers could not be loaded.')
    })

    it('never says you are in no group, or have nothing, when those could not be loaded (#248)', async () => {
        const { element } = await render({ failed: { groups: true, games: true, history: true, reviews: true } })
        const text = element.textContent ?? ''

        expect(element.querySelector('[role="alert"]')?.textContent).toContain('Some of your numbers could not be loaded.')
        expect(text).toContain('Your groups could not be loaded.')
        expect(text).toContain('Your game nights could not be loaded.')
        expect(text).toContain('Your ratings could not be loaded.')
        expect(text).not.toContain('You are not in a group yet.')
        expect(text).not.toContain('Games you play show here once a night is recorded.')
        expect(text).not.toContain('Rate a game after you play it')
        expect([...element.querySelectorAll('dl dd')].map((dd) => dd.textContent?.trim())).toEqual(Array(4).fill('—Not loaded'))
    })

    it('Retry loads again only what failed, including the groups whose numbers failed', async () => {
        const { element, refresh, api, fixture } = await render({
            insights: { 20: throwError(() => new Error('down')) },
            failed: { history: true, stats: true },
        })
        api.getGroupInsights.mockClear()

        element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click()
        fixture.detectChanges()

        expect(refresh.refreshUserHistory).toHaveBeenCalledTimes(1)
        expect(refresh.refreshUserStats).toHaveBeenCalledTimes(1)
        expect(refresh.refreshUserGroups).not.toHaveBeenCalled()
        expect(refresh.refreshUserGames).not.toHaveBeenCalled()
        expect(refresh.refreshGameReviews).not.toHaveBeenCalled()
        expect(api.getGroupInsights).toHaveBeenCalledTimes(1)
        expect(api.getGroupInsights).toHaveBeenCalledWith(20)
    })

    it('Retry loads your groups, games and ratings again when those failed', async () => {
        const { element, refresh, fixture } = await render({ failed: { groups: true, games: true, reviews: true } })

        element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click()
        fixture.detectChanges()

        expect(refresh.refreshUserGroups).toHaveBeenCalledTimes(1)
        expect(refresh.refreshUserGames).toHaveBeenCalledTimes(1)
        expect(refresh.refreshGameReviews).toHaveBeenCalledTimes(1)
        expect(refresh.refreshUserHistory).not.toHaveBeenCalled()
        expect(refresh.refreshUserStats).not.toHaveBeenCalled()
    })

    it('shows the numbers again, without the error, once Retry loads your groups', async () => {
        const { element, groups, errors, fixture } = await render({
            insights: { 10: of(standing(4, 9, 3)), 20: of(standing(2, 3, 1)) },
            failed: { groups: true },
        })
        expect(element.textContent).toContain('Not loaded')

        element.querySelector<HTMLButtonElement>('[role="alert"] button')?.click()
        errors.userGroupsError.set(false)
        groups.set([
            { id: 10, name: 'Thursdays' },
            { id: 20, name: 'Family' },
        ])
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()

        expect(element.querySelector('[role="alert"]')).toBeNull()
        expect(element.textContent).not.toContain('Not loaded')
        expect([...element.querySelectorAll('dl dd')].map((dd) => dd.textContent?.trim()).slice(0, 3)).toEqual(['6', '12', '4'])
    })

    it('shows no error when everything loaded', async () => {
        const { element } = await render()

        expect(element.querySelector('[role="alert"]')).toBeNull()
        expect(element.textContent).not.toContain('Not loaded')
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
