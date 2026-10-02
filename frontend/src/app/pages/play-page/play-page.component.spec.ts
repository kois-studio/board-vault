import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { PlayPageComponent } from './play-page.component'

describe('PlayPageComponent', () => {
    const setup = async (meetsError = false) => {
        await TestBed.configureTestingModule({
            imports: [PlayPageComponent],
            providers: [
                {
                    provide: DataService,
                    useValue: {
                        userGroups: signal([{ id: 7, name: 'Friday crew', members: [] }]),
                        userMeets: signal([
                            { id: 1, groupId: 7, status: 'completed', meetDate: '2026-09-01T18:00:00Z', timezone: 'UTC' },
                            { id: 2, groupId: 7, status: 'scheduled', meetDate: '2026-12-01T18:00:00Z', timezone: 'UTC' },
                        ]),
                        userHistory: signal([{}, {}, {}]),
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
            '/play/history',
            '/play/recommendations',
            '/play/log-session',
        ])
        expect(cards[0].textContent).toContain('1 sessions')
        expect(cards[0].textContent).toContain('Next: Friday crew')
        expect(cards[1].textContent).toContain('3 sessions')
    })

    it('says when sessions could not be loaded instead of showing zero', async () => {
        const element = await setup(true)

        expect(element.textContent).toContain('Unavailable')
        expect(element.textContent).toContain('Sessions could not be loaded')
    })
})
