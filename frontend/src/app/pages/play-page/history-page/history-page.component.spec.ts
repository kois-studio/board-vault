import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { HistoryPageComponent } from './history-page.component'

describe('HistoryPageComponent shared-memory summaries', () => {
    it('summarizes the selected group history without turning it into global analytics', async () => {
        const history = [
            {
                meetData: { id: 11, groupId: 7, meetDate: '2026-09-05T19:00:00.000Z', timezone: 'Europe/Madrid', notes: 'Great opener' },
                attendedBy: [
                    { id: 1, displayName: 'Ana', username: 'ana' },
                    { id: 2, displayName: 'Bo', username: 'bo' },
                ],
                gamesPlayed: [
                    {
                        gameData: { id: 42, title: 'Cascadia', titleTranslations: { en: 'Cascadia' } },
                        playedBy: [{ id: 4, displayName: 'Dee', username: 'dee' }],
                    },
                    { gameData: { id: 43, title: 'Scout', titleTranslations: { en: 'Scout' } }, playedBy: [] },
                ],
            },
            {
                meetData: { id: 10, groupId: 7, meetDate: '2026-08-29T19:00:00.000Z', timezone: 'Europe/Madrid', notes: null },
                attendedBy: [{ id: 1, displayName: 'Ana', username: 'ana' }],
                gamesPlayed: [{ gameData: { id: 42, title: 'Cascadia', titleTranslations: { en: 'Cascadia' } }, playedBy: [] }],
            },
            {
                meetData: { id: 9, groupId: 8, meetDate: '2026-09-04T19:00:00.000Z', timezone: 'Europe/Madrid', notes: null },
                attendedBy: [{ id: 3, displayName: 'Cris', username: 'cris' }],
                gamesPlayed: [{ gameData: { id: 44, title: 'Azul', titleTranslations: { en: 'Azul' } }, playedBy: [] }],
            },
        ]
        const dataService = {
            currentUser: signal(null),
            userGroups: signal([
                { id: 7, name: 'Friday Crew' },
                { id: 8, name: 'Sunday Crew' },
            ]),
            userGroupsError: signal(false),
            userHistory: signal(history),
            userHistoryError: signal(false),
            refreshUserHistory: vi.fn().mockName('refreshUserHistory'),
        }
        const loadingService = {
            loadingStatesIndex: signal({ [LOADING_KEYS.USER_GAMES_HISTORY]: false }),
        }

        await TestBed.configureTestingModule({
            imports: [HistoryPageComponent],
            providers: [
                { provide: DataService, useValue: dataService },
                { provide: LoadingService, useValue: loadingService },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ groupId: '7' }) } } },
                provideRouter([]),
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(HistoryPageComponent)
        fixture.detectChanges()
        const component = fixture.componentInstance
        component.groupIdFilter.set(7)
        fixture.detectChanges()

        expect(component.sortedUserHistoryComputed().map((record) => record.meetData.id)).toEqual([11, 10])
        expect(component.historySummary()).toEqual({
            sessions: 2,
            gamesPlayed: 3,
            uniqueGames: 2,
            people: 3,
            mostPlayed: { title: 'Cascadia', count: 2 },
        })
        expect(component.mostPlayedSummary()).toBe('Cascadia · 2 sessions')
        expect(component.getPlayedBySummary([{ displayName: 'Dee', username: 'dee' }])).toBe('Dee')
        expect(fixture.nativeElement.textContent).toContain('What should this group play next?')
        expect(component.visibleMonths().map((month) => month.label)).toEqual(['September 2026', 'August 2026'])
        expect((fixture.nativeElement.querySelector('#history-group-filter') as HTMLSelectElement).value).toBe('7')
        expect(component.getGameInitials('Cascadia')).toBe('C')

        component.groupIdFilter.set(999)
        fixture.detectChanges()

        expect(component.isUnknownGroupFilter()).toBe(true)
        expect(fixture.nativeElement.textContent).toContain('That group is not available')
        expect(fixture.nativeElement.textContent).not.toContain('has no recorded sessions yet')
    })

    it('keeps long unbroken player names and notes inside the session card', async () => {
        const longName = '⸻'.repeat(20)
        const longNote = `Hicieron ${'trahgioubneriog'.repeat(20)} y más.`
        const dataService = {
            currentUser: signal(null),
            userGroups: signal([{ id: 7, name: 'Friday Crew' }]),
            userGroupsError: signal(false),
            userHistory: signal([
                {
                    meetData: { id: 11, groupId: 7, meetDate: '2026-09-05T19:00:00.000Z', timezone: 'Europe/Madrid', notes: longNote },
                    attendedBy: [{ id: 5, displayName: longName, username: 'long-name' }],
                    gamesPlayed: [
                        {
                            gameData: { id: 42, title: 'Cascadia', titleTranslations: { en: 'Cascadia' } },
                            playedBy: [{ id: 5, displayName: longName, username: 'long-name' }],
                        },
                    ],
                },
            ]),
            userHistoryError: signal(false),
            refreshUserHistory: vi.fn().mockName('refreshUserHistory'),
        }

        await TestBed.configureTestingModule({
            imports: [HistoryPageComponent],
            providers: [
                { provide: DataService, useValue: dataService },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({ [LOADING_KEYS.USER_GAMES_HISTORY]: false }) } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                provideRouter([]),
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(HistoryPageComponent)
        fixture.detectChanges()

        // jsdom has no layout: assert the classes that keep the text inside the card.
        const playedBy = fixture.nativeElement.querySelector('[title^="Played by"]') as HTMLElement
        expect(playedBy.title).toBe(`Played by ${longName}`)
        expect(playedBy.getAttribute('aria-label')).toBe(`Played by ${longName}`)
        expect([...playedBy.classList]).toEqual(expect.arrayContaining(['min-w-0', 'line-clamp-2', 'wrap-anywhere']))

        const attendees = [...fixture.nativeElement.querySelectorAll('article p')].find((element: HTMLElement) =>
            element.textContent?.startsWith('With'),
        ) as HTMLParagraphElement
        expect(attendees.classList).toContain('wrap-anywhere')
        expect(attendees.parentElement?.classList).toContain('min-w-0')

        const note = [...fixture.nativeElement.querySelectorAll('article p')].find((element: HTMLElement) =>
            element.textContent?.includes('Hicieron'),
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
        const dataService = {
            currentUser: signal(null),
            userGroups: signal([{ id: 7, name: 'DuckDevs TestGroup' }]),
            userGroupsError: signal(false),
            userHistory: signal([
                {
                    meetData: { id: 58, groupId: 7, meetDate: '2026-10-01T10:00:00.000Z', timezone: 'Europe/Madrid', notes: null },
                    attendedBy: [],
                    attendedByPeople: people,
                    gamesPlayed: [
                        {
                            gameData: { id: 42, title: 'Casting Shadows', titleTranslations: { en: 'Casting Shadows' } },
                            playedBy: [],
                            playedByPeople: people,
                        },
                    ],
                },
            ]),
            userHistoryError: signal(false),
            refreshUserHistory: vi.fn().mockName('refreshUserHistory'),
        }

        await TestBed.configureTestingModule({
            imports: [HistoryPageComponent],
            providers: [
                { provide: DataService, useValue: dataService },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({ [LOADING_KEYS.USER_GAMES_HISTORY]: false }) } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                provideRouter([]),
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(HistoryPageComponent)
        fixture.detectChanges()
        const text = fixture.nativeElement.textContent as string

        expect(text).not.toContain('Attendance not recorded')
        expect(text).not.toContain('Players not recorded')
        expect(text).toContain('With bloddsword, David M. Fajardo, Guest')
        expect(fixture.nativeElement.querySelector('[title^="Played by"]')?.getAttribute('title')).toBe(
            'Played by bloddsword, David M. Fajardo, Guest',
        )
        // Two attendee avatars come from accounts, and the guest without one gets initials.
        const avatars = [...fixture.nativeElement.querySelectorAll('app-image-profile')] as Array<HTMLElement>
        expect(avatars.length).toBe(3)
        expect(avatars[2]?.textContent).toContain('G')
        expect(text).toContain('Everyone played')
        expect(fixture.componentInstance.historySummary().people).toBe(3)
    })
})

describe('HistoryPageComponent long histories', () => {
    it('shows ten sessions at first and older ones on request', async () => {
        const history = Array.from({ length: 13 }, (_, index) => ({
            meetData: {
                id: index + 1,
                groupId: 7,
                meetDate: new Date(Date.UTC(2026, 8, 28 - index * 2, 18)).toISOString(),
                timezone: 'UTC',
                notes: null,
            },
            attendedBy: [],
            gamesPlayed: [],
        }))
        await TestBed.configureTestingModule({
            imports: [HistoryPageComponent],
            providers: [
                {
                    provide: DataService,
                    useValue: {
                        userGroups: signal([{ id: 7, name: 'Friday Crew' }]),
                        userGroupsError: signal(false),
                        userHistory: signal(history),
                        userHistoryError: signal(false),
                        refreshUserHistory: vi.fn(),
                    },
                },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({ [LOADING_KEYS.USER_GAMES_HISTORY]: false }) } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                provideRouter([]),
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(HistoryPageComponent)
        fixture.detectChanges()
        const element = fixture.nativeElement as HTMLElement

        expect(element.querySelectorAll('article').length).toBe(10)
        const showMore = [...element.querySelectorAll('button')].find((button) => button.textContent?.includes('Show older sessions'))
        expect(showMore?.textContent).toContain('(3)')

        showMore?.click()
        fixture.detectChanges()

        expect(element.querySelectorAll('article').length).toBe(13)
        expect(element.textContent).not.toContain('Show older sessions')
    })
})
