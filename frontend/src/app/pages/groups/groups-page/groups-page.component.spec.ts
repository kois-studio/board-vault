import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { provideRouter } from '@angular/router'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { GroupsPageComponent } from './groups-page.component'

describe('GroupsPageComponent empty state', () => {
    it('points a new account to create a group', async () => {
        await TestBed.configureTestingModule({
            imports: [GroupsPageComponent],
            providers: [
                {
                    provide: DataService,
                    useValue: {
                        userGroups: signal([]),
                        userGroupsError: signal(false),
                        userInvitations: signal([]),
                        userInvitationsError: signal(false),
                        userInvitationsLoading: signal(false),
                        invitationsGroupIndex: signal({}),
                    },
                },
                {
                    provide: LoadingService,
                    useValue: { loadingStatesIndex: signal({ [LOADING_KEYS.USER_GROUPS]: false }) },
                },
                provideRouter([]),
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(GroupsPageComponent)
        fixture.detectChanges()

        expect(fixture.nativeElement.textContent).toContain('Your group space starts with an invitation or a new group.')
        expect(fixture.nativeElement.querySelector('a[href="/create-group"]')?.textContent).toContain('Create your first group')
    })
})
