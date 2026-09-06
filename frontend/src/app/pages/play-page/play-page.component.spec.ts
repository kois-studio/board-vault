import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { PlayPageComponent } from './play-page.component'

describe('PlayPageComponent group-first entry', () => {
    let fixture: ComponentFixture<PlayPageComponent>

    beforeEach(async () => {
        await TestBed.configureTestingModule({
            imports: [PlayPageComponent],
            providers: [
                {
                    provide: DataService,
                    useValue: {
                        userGroups: signal([
                            {
                                id: 7,
                                name: 'Friday crew',
                                members: [
                                    { id: 1, games: [{ id: 11 }, { id: 12 }] },
                                    { id: 2, games: [{ id: 12 }] },
                                ],
                            },
                        ]),
                        userMeets: signal([]),
                        userHistory: signal([]),
                        userMeetsError: signal(false),
                        userHistoryError: signal(false),
                    },
                },
                {
                    provide: LoadingService,
                    useValue: {
                        loadingStatesIndex: signal({
                            [LOADING_KEYS.USER_MEETS]: false,
                            [LOADING_KEYS.USER_GAMES_HISTORY]: false,
                        }),
                    },
                },
                provideRouter([]),
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(PlayPageComponent)
        fixture.detectChanges()
    })

    it('leads with group decisions and keeps context honest', () => {
        const element = fixture.nativeElement as HTMLElement

        expect(element.textContent).toContain('Which group are you planning for?')
        expect(element.textContent).toContain('Friday crew')
        expect(element.textContent).toContain('2 people · 2 games available')
        expect(element.textContent).toContain('Decide')
        expect(element.textContent).toContain('Plan session')
        expect(element.textContent).toContain('Record a past session')

        const recommendationCard = Array.from(element.querySelectorAll('app-card-section')).find((card) =>
            card.textContent?.includes('Decide with a group'),
        )
        expect(recommendationCard?.getAttribute('cardlink')).toBe('/groups')
    })
})
