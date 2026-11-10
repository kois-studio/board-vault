import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { type Observable, of, Subject, throwError } from 'rxjs'
import { Api } from '../../../api/api'
import type { HistoryPageOptions } from '../../../api/api.types'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { HistoryPageComponent } from './history-page.component'

type Page = { entries: Array<unknown>; hasMore: boolean }
const summaryOf = (nights: number, more: Partial<Record<string, unknown>> = {}) => ({
    nights,
    gamesPlayed: 0,
    uniqueGames: 0,
    people: 0,
    mostPlayed: null,
    myMostPlayed: [],
    ...more,
})

/** History reads its own pages and totals from the server (#252); the fake answers them. */
async function setup({
    history = (): Observable<Page> => of({ entries: [], hasMore: false }),
    summary = (): Observable<unknown> => of(summaryOf(0)),
    groups = [{ id: 7, name: 'Friday Crew' }],
    groupId,
}: {
    history?: (userId: number, options: HistoryPageOptions) => Observable<Page>
    summary?: (userId: number, filters: { groupId?: number }) => Observable<unknown>
    groups?: Array<{ id: number; name: string }>
    groupId?: string
}) {
    const api = { getUserGamesHistory: vi.fn(history), getUserHistorySummary: vi.fn(summary) }
    const dataService = {
        currentUser: signal({ id: 1 }),
        userGroups: signal(groups),
        userGroupsError: signal(false),
        userHistoryRevision: signal(0),
    }
    await TestBed.configureTestingModule({
        imports: [HistoryPageComponent],
        providers: [
            { provide: Api, useValue: api },
            { provide: DataService, useValue: dataService },
            { provide: LoadingService, useValue: { loadingStatesIndex: signal({ [LOADING_KEYS.USER_GROUPS]: false }) } },
            provideRouter([]),
            // After the router, which provides a route of its own.
            {
                provide: ActivatedRoute,
                useValue: { snapshot: { queryParamMap: convertToParamMap(groupId ? { groupId } : {}) } },
            },
        ],
    }).compileComponents()

    const fixture = TestBed.createComponent(HistoryPageComponent)
    fixture.detectChanges()
    return { fixture, component: fixture.componentInstance, element: fixture.nativeElement as HTMLElement, api, dataService }
}

const night = (id: number, date: string, more: Record<string, unknown> = {}) => ({
    meetData: { id, groupId: 7, meetDate: date, timezone: 'Europe/Madrid', notes: null },
    attendedBy: [],
    gamesPlayed: [],
    ...more,
})

describe('HistoryPageComponent shared-memory summaries', () => {
    it('shows one group’s nights with the totals the server counted for that group', async () => {
        const { fixture, component, element, api } = await setup({
            groupId: '7',
            groups: [
                { id: 7, name: 'Friday Crew' },
                { id: 8, name: 'Sunday Crew' },
            ],
            history: () =>
                of({
                    entries: [
                        night(11, '2026-09-05T19:00:00.000Z', {
                            attendedBy: [{ id: 1, displayName: 'Ana', username: 'ana' }],
                            gamesPlayed: [
                                {
                                    gameData: { id: 42, title: 'Cascadia', titleTranslations: { en: 'Cascadia' } },
                                    playedBy: [{ id: 4, displayName: 'Dee', username: 'dee' }],
                                },
                            ],
                        }),
                        night(10, '2026-08-29T19:00:00.000Z'),
                    ],
                    hasMore: false,
                }),
            summary: () =>
                of(
                    summaryOf(2, {
                        gamesPlayed: 3,
                        uniqueGames: 2,
                        people: 3,
                        mostPlayed: { game: { id: 42, title: 'Cascadia', titleTranslations: { en: 'Cascadia' } }, nights: 2 },
                    }),
                ),
        })

        expect(api.getUserGamesHistory).toHaveBeenCalledWith(1, { groupId: 7, before: undefined, limit: 20 })
        expect(api.getUserHistorySummary).toHaveBeenCalledWith(1, { groupId: 7 })
        expect(component.historySummary()).toEqual({
            sessions: 2,
            gamesPlayed: 3,
            uniqueGames: 2,
            people: 3,
            mostPlayed: { title: 'Cascadia', count: 2 },
        })
        expect(component.mostPlayedSummary()).toBe('Cascadia · 2 sessions')
        expect(element.querySelectorAll('dd')[0]?.textContent).toBe('2')
        expect(component.getPlayedBySummary([{ displayName: 'Dee', username: 'dee' }])).toBe('Dee')
        expect(element.textContent).toContain('What should this group play next?')
        expect(component.visibleMonths().map((month) => month.label)).toEqual(['September 2026', 'August 2026'])
        expect((element.querySelector('#history-group-filter') as HTMLSelectElement).value).toBe('7')
        expect(component.getGameInitials('Cascadia')).toBe('C')

        component.groupIdFilter.set(999)
        fixture.detectChanges()

        expect(component.isUnknownGroupFilter()).toBe(true)
        expect(element.textContent).toContain('That group is not available')
        expect(element.textContent).not.toContain('has no recorded sessions yet')
    })

    it('keeps the list when the totals do not load, leaving the numbers out', async () => {
        const { component, element } = await setup({
            history: () => of({ entries: [night(1, '2026-09-05T19:00:00.000Z')], hasMore: false }),
            summary: () => throwError(() => new Error('offline')),
        })

        expect(element.querySelectorAll('article').length).toBe(1)
        expect(component.historySummary()).toBeNull()
        expect(element.querySelector('dl')).toBeNull()
    })

    it('keeps long unbroken player names and notes inside the session card', async () => {
        const longName = '⸻'.repeat(20)
        const longNote = `Hicieron ${'trahgioubneriog'.repeat(20)} y más.`
        const { element } = await setup({
            history: () =>
                of({
                    entries: [
                        night(11, '2026-09-05T19:00:00.000Z', {
                            meetData: {
                                id: 11,
                                groupId: 7,
                                meetDate: '2026-09-05T19:00:00.000Z',
                                timezone: 'Europe/Madrid',
                                notes: longNote,
                            },
                            attendedBy: [{ id: 5, displayName: longName, username: 'long-name' }],
                            gamesPlayed: [
                                {
                                    gameData: { id: 42, title: 'Cascadia', titleTranslations: { en: 'Cascadia' } },
                                    playedBy: [{ id: 5, displayName: longName, username: 'long-name' }],
                                },
                            ],
                        }),
                    ],
                    hasMore: false,
                }),
        })

        // jsdom has no layout: assert the classes that keep the text inside the card.
        const playedBy = element.querySelector('[title^="Played by"]') as HTMLElement
        expect(playedBy.title).toBe(`Played by ${longName}`)
        expect(playedBy.getAttribute('aria-label')).toBe(`Played by ${longName}`)
        expect([...playedBy.classList]).toEqual(expect.arrayContaining(['min-w-0', 'line-clamp-2', 'wrap-anywhere']))

        const attendees = [...element.querySelectorAll('article p')].find((paragraph) =>
            paragraph.textContent?.startsWith('With'),
        ) as HTMLParagraphElement
        expect(attendees.classList).toContain('wrap-anywhere')
        expect(attendees.parentElement?.classList).toContain('min-w-0')

        const note = [...element.querySelectorAll('article p')].find((paragraph) =>
            paragraph.textContent?.includes('Hicieron'),
        ) as HTMLParagraphElement
        expect(note.textContent).toContain(longNote)
        expect(note.classList).toContain('wrap-anywhere')
    })
})

describe('HistoryPageComponent sessions recorded with group people', () => {
    it('shows the attendees and players of a session recorded only with group people', async () => {
        const avatar = { backgroundColor: '#EF4444', iconName: null, emoji: '😎', type: 'emoji' as const, initials: '' }
        const people = [
            { id: 3, displayName: 'bloddsword', avatar, accountId: 6 },
            { id: 1, displayName: 'David M. Fajardo', avatar: null, accountId: 1 },
            { id: 9, displayName: 'Guest', avatar: null, accountId: null },
        ]
        const { element } = await setup({
            groups: [{ id: 7, name: 'DuckDevs TestGroup' }],
            history: () =>
                of({
                    entries: [
                        night(58, '2026-10-01T10:00:00.000Z', {
                            attendedByPeople: people,
                            gamesPlayed: [
                                {
                                    gameData: { id: 42, title: 'Casting Shadows', titleTranslations: { en: 'Casting Shadows' } },
                                    playedBy: [],
                                    playedByPeople: people,
                                },
                            ],
                        }),
                    ],
                    hasMore: false,
                }),
        })
        const text = element.textContent as string

        expect(text).not.toContain('Attendance not recorded')
        expect(text).not.toContain('Players not recorded')
        expect(text).toContain('With bloddsword, David M. Fajardo, Guest')
        expect(element.querySelector('[title^="Played by"]')?.getAttribute('title')).toBe('Played by bloddsword, David M. Fajardo, Guest')
        // Two attendee avatars come from accounts, and the guest without one gets initials.
        const avatars = [...element.querySelectorAll('app-image-profile')] as Array<HTMLElement>
        expect(avatars.length).toBe(3)
        expect(avatars[2]?.textContent).toContain('G')
        expect(text).toContain('Everyone played')
    })
})

describe('HistoryPageComponent long histories', () => {
    const nights = (from: number, count: number) =>
        Array.from({ length: count }, (_, index) =>
            night(from - index, new Date(Date.UTC(2026, 8, 28 - (100 - from + index), 18)).toISOString()),
        )
    const showOlder = (element: HTMLElement) =>
        [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('older sessions'))

    it('reads twenty sessions at first and the older ones from the server on request (#252)', async () => {
        const { fixture, element, api } = await setup({
            history: (_userId, options) =>
                of(options.before === undefined ? { entries: nights(100, 20), hasMore: true } : { entries: nights(80, 3), hasMore: false }),
            summary: () => of(summaryOf(23)),
        })

        expect(element.querySelectorAll('article').length).toBe(20)
        expect(showOlder(element)?.textContent).toContain('Show older sessions (3)')

        showOlder(element)?.click()
        fixture.detectChanges()

        // The page after the last night shown, so nights that share a date are never skipped.
        expect(api.getUserGamesHistory).toHaveBeenLastCalledWith(1, { groupId: undefined, before: 81, limit: 20 })
        expect(element.querySelectorAll('article').length).toBe(23)
        expect(showOlder(element)).toBeUndefined()
    })

    it('still offers older sessions before the totals say how many', async () => {
        const { element } = await setup({
            history: () => of({ entries: nights(100, 20), hasMore: true }),
            summary: () => new Subject(),
        })

        expect(showOlder(element)?.textContent?.trim()).toBe('Show older sessions')
    })

    it('says when older sessions fail, keeps the ones shown, and tries again', async () => {
        let failOlder = true
        const { fixture, element, api } = await setup({
            history: (_userId, options) =>
                options.before === undefined
                    ? of({ entries: nights(100, 20), hasMore: true })
                    : failOlder
                      ? throwError(() => new Error('offline'))
                      : of({ entries: nights(80, 1), hasMore: false }),
            summary: () => of(summaryOf(21)),
        })

        showOlder(element)?.click()
        fixture.detectChanges()

        expect(element.textContent).toContain('Older sessions could not be loaded.')
        expect(element.querySelectorAll('article').length).toBe(20)

        failOlder = false
        ;[...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Retry'))?.click()
        fixture.detectChanges()

        expect(api.getUserGamesHistory).toHaveBeenLastCalledWith(1, { groupId: undefined, before: 81, limit: 20 })
        expect(element.querySelectorAll('article').length).toBe(21)
        expect(element.textContent).not.toContain('could not be loaded')
    })

    it('says when the history fails and loads it again on Retry', async () => {
        let fail = true
        const { fixture, element } = await setup({
            history: () => (fail ? throwError(() => new Error('offline')) : of({ entries: nights(100, 1), hasMore: false })),
        })

        expect(element.textContent).toContain('History could not be loaded.')

        fail = false
        ;[...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Retry'))?.click()
        fixture.detectChanges()

        expect(element.querySelectorAll('article').length).toBe(1)
    })

    it('starts over for another group, and a late answer for the old one never lands in the list', async () => {
        const late = new Subject<Page>()
        const { fixture, component, element, api } = await setup({
            groups: [
                { id: 7, name: 'Friday Crew' },
                { id: 8, name: 'Sunday Crew' },
            ],
            history: (_userId, options) => (options.groupId === 8 ? of({ entries: nights(50, 2), hasMore: false }) : late),
        })
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)

        component.setGroupFilter({ target: { value: '8' } } as unknown as Event)
        fixture.detectChanges()
        late.next({ entries: nights(100, 20), hasMore: true })
        fixture.detectChanges()

        expect(api.getUserGamesHistory).toHaveBeenLastCalledWith(1, { groupId: 8, before: undefined, limit: 20 })
        expect(api.getUserHistorySummary).toHaveBeenLastCalledWith(1, { groupId: 8 })
        expect(navigate).toHaveBeenCalled()
        expect(element.querySelectorAll('article').length).toBe(2)
    })

    it('reads the history again when it changes, as after recording a night', async () => {
        const { fixture, api, dataService } = await setup({})

        dataService.userHistoryRevision.set(1)
        fixture.detectChanges()

        expect(api.getUserGamesHistory).toHaveBeenCalledTimes(2)
        expect(api.getUserHistorySummary).toHaveBeenCalledTimes(2)
    })
})
