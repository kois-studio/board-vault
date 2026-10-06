import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { PlayPageComponent } from './play-page.component'

describe('PlayPageComponent', () => {
    const setup = async (meetsError = false, extraMeets: Array<object> = []) => {
        await TestBed.configureTestingModule({
            imports: [PlayPageComponent],
            providers: [
                {
                    provide: DataService,
                    useValue: {
                        userGroups: signal([{ id: 7, name: 'Friday crew', members: [] }]),
                        userMeets: signal([
                            { id: 1, groupId: 7, status: 'completed', meetDate: '2026-09-01T18:00:00Z', timezone: 'UTC' },
                            { id: 2, groupId: 7, status: 'scheduled', meetDate: '2099-12-01T18:00:00Z', timezone: 'UTC' },
                            ...extraMeets,
                        ]),
                        userHistory: signal([
                            { meetData: { groupId: 7, meetDate: '2026-09-01T18:00:00Z' } },
                            { meetData: { groupId: 7, meetDate: '2026-08-01T18:00:00Z' } },
                            { meetData: { groupId: 7, meetDate: '2026-07-01T18:00:00Z' } },
                        ]),
                        userMeetsError: signal(meetsError),
                        userHistoryError: signal(false),
                    },
                },
                {
                    provide: LoadingService,
                    useValue: {
                        loadingStatesIndex: signal({ [LOADING_KEYS.USER_MEETS]: false, [LOADING_KEYS.USER_GAMES_HISTORY]: false }),
                    },
                },
                provideRouter([]),
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(PlayPageComponent)
        fixture.detectChanges()
        return fixture.nativeElement as HTMLElement
    }

    it('links to every subpage and summarises upcoming sessions and history', async () => {
        const element = await setup()

        const cards = Array.from(element.querySelectorAll('app-card-section'))
        expect(cards.map((card) => card.getAttribute('cardlink'))).toEqual([
            '/play/upcoming-sessions',
            '/play/recommendations',
            '/play/history',
            '/play/log-session',
        ])
        expect(cards[0]?.textContent).toContain('1 session')
        expect(cards[0]?.textContent).toContain('Next: Friday crew')
        expect(cards[2]?.textContent).toContain('3 sessions')
        expect(cards[2]?.textContent).toContain('Last: Friday crew')
    })

    it('calls a game night in progress happening now, not next', async () => {
        const element = await setup(false, [{ id: 4, groupId: 7, status: 'active', meetDate: '2026-01-01T18:00:00Z', timezone: 'UTC' }])
        const upcoming = element.querySelector('app-card-section')?.textContent ?? ''

        expect(upcoming).toContain('Happening now: Friday crew')
        expect(upcoming).not.toContain('Next:')
    })

    it('flags planned sessions whose night has passed', async () => {
        const element = await setup(false, [{ id: 3, groupId: 7, status: 'scheduled', meetDate: '2026-01-01T18:00:00Z', timezone: 'UTC' }])

        expect(element.querySelector('app-card-section')?.textContent).toContain('1 session waiting for results')
    })

    it('says when sessions could not be loaded instead of showing zero', async () => {
        const element = await setup(true)

        expect(element.textContent).toContain('Unavailable')
        expect(element.textContent).toContain('Sessions could not be loaded')
    })
})
