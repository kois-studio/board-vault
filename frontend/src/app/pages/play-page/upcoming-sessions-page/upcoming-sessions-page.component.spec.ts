import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { UpcomingSessionsPageComponent } from './upcoming-sessions-page.component'

describe('UpcomingSessionsPageComponent social context', () => {
    const setup = async () => {
        const dataService = {
            currentUser: signal(null),
            userGroups: signal([]),
            userGroupsError: signal(false),
            userMeets: signal([]),
            userMeetsError: signal(false),
            refreshUserGroups: vi.fn().mockName('refreshUserGroups'),
            refreshUserMeets: vi.fn().mockName('refreshUserMeets'),
        }
        const loadingService = {
            loadingStatesIndex: signal({
                [LOADING_KEYS.USER_GROUPS]: false,
                [LOADING_KEYS.USER_MEETS]: false,
            }),
        }

        await TestBed.configureTestingModule({
            imports: [UpcomingSessionsPageComponent],
            providers: [
                { provide: DataService, useValue: dataService },
                { provide: LoadingService, useValue: loadingService },
                provideRouter([]),
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(UpcomingSessionsPageComponent)
        fixture.detectChanges()
        return { fixture, component: fixture.componentInstance }
    }

    it('uses human-readable labels for the session states shown to friends', async () => {
        const { component } = await setup()

        expect(component.getStatusLabel('scheduled')).toBe('Planned')
        expect(component.getStatusLabel('active')).toBe('Live now')
        expect(component.getSessionActionLabel('scheduled')).toBe('Open session')
        expect(component.getSessionActionLabel('active')).toBe('Open live session')
    })

    it('describes a session using available group context without claiming everyone is attending', async () => {
        const { component } = await setup()
        component.userGroups$.set([
            {
                id: 7,
                name: 'Friday crew',
                createdBy: 1,
                createdAt: '2026-09-01T10:00:00.000Z',
                members: [
                    { id: 1, games: [{ id: 11 }, { id: 12 }] },
                    { id: 2, games: [{ id: 12 }, { id: 13 }] },
                ],
            } as never,
        ])

        expect(component.getGroupContext(7)).toBe('2 people · 3 games available')
        expect(component.getSessionPrompt('scheduled')).toBe('Review attendees and the game shortlist')
        expect(component.getSessionPrompt('active')).toBe('Record what the group actually plays')
    })
})
