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
        expect(fixture.nativeElement.textContent).toContain('Get a recommendation for this group')
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
            element.textContent?.includes(longName),
        ) as HTMLParagraphElement
        expect(attendees.classList).toContain('wrap-anywhere')
        expect(attendees.parentElement?.classList).toContain('min-w-0')

        const note = [...fixture.nativeElement.querySelectorAll('article p')].find((element: HTMLElement) =>
            element.textContent?.includes('Session note:'),
        ) as HTMLParagraphElement
        expect(note.textContent).toContain(longNote)
        expect(note.classList).toContain('wrap-anywhere')
    })
})
