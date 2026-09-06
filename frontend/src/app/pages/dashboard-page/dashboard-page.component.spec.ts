import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { DashboardPageComponent } from './dashboard-page.component'

describe('DashboardPageComponent decision handoff', () => {
    it('selects a group with shared games for the decision card', async () => {
        const dataService = {
            userGroups: signal([
                { id: 10, name: 'Friday Crew', members: [{ id: 1, games: [] }] },
                { id: 11, name: 'Sunday Crew', members: [{ id: 2, games: [{ id: 42 }] }] },
            ]),
            userMeets: signal([]),
            userGroupsError: signal(false),
            userMeetsError: signal(false),
        }

        await TestBed.configureTestingModule({
            imports: [DashboardPageComponent],
            providers: [
                { provide: DataService, useValue: dataService },
                {
                    provide: LoadingService,
                    useValue: { loadingStatesIndex: signal({ [LOADING_KEYS.USER_GROUPS]: false, [LOADING_KEYS.USER_MEETS]: false }) },
                },
                provideRouter([]),
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(DashboardPageComponent)
        fixture.detectChanges()

        expect(fixture.componentInstance.decisionGroup()?.group.name).toBe('Sunday Crew')
        expect(fixture.nativeElement.querySelector('a[href="/play/recommendations?groupId=11"]')).not.toBeNull()
        expect(fixture.nativeElement.textContent).toContain('Choose for Sunday Crew')
    })
})
