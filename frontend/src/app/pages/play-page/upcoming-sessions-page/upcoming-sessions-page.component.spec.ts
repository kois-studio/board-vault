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
            refreshUserGroups: jasmine.createSpy('refreshUserGroups'),
            refreshUserMeets: jasmine.createSpy('refreshUserMeets'),
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
})
