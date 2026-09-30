import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { LOADING_KEYS } from '../../core/enums/loading-keys-enum'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { MeetNewComponent } from './meet-new.component'

describe('MeetNewComponent social handoff', () => {
    const group = {
        id: 7,
        name: 'Friday Crew',
        createdBy: 1,
        members: [
            {
                id: 1,
                displayName: 'Organizer',
                username: 'organizer',
                games: [{ id: 42, title: 'Cascadia', titleTranslations: { en: 'Cascadia', es: 'Cascadia' } }],
            },
            { id: 2, displayName: 'Member', username: 'member', games: [] },
        ],
    }

    const setup = async (queryParams: Record<string, string> = {}) => {
        const api = {
            scheduleSession: vi
                .fn()
                .mockName('scheduleSession')
                .mockReturnValue(of({ id: 99 })),
        }
        const routerData = {
            snapshot: {
                paramMap: convertToParamMap({ groupId: '7' }),
                queryParamMap: convertToParamMap(queryParams),
            },
        }
        const dataService = {
            currentUser: signal({ id: 1 }),
            userGroups: signal([group]),
            invitationsGroupIndex: signal({}),
            userGroupsError: signal(false),
            refreshUserMeets: vi.fn().mockName('refreshUserMeets'),
        }
        const loadingService = {
            loadingStatesIndex: signal({ [LOADING_KEYS.USER_GROUPS]: false }),
        }

        await TestBed.configureTestingModule({
            imports: [MeetNewComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: routerData },
                { provide: DataService, useValue: dataService },
                { provide: LoadingService, useValue: loadingService },
                { provide: ToastService, useValue: { success: vi.fn().mockName('success'), error: vi.fn().mockName('error') } },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(MeetNewComponent)
        fixture.detectChanges()
        return { fixture, component: fixture.componentInstance, api, dataService, loadingService }
    }

    it('restores selected attendees and the recommended game from the decision handoff', async () => {
        const { component } = await setup({ attendeeIds: '2', plannedGameId: '42' })

        expect(component.groupData?.id).toBe(7)
        expect(component.selectedAttendeeIds).toEqual([2])
        expect(component.selectedPlannedGameIds).toEqual([42])
        expect(component.availableGames.map((game) => game.id)).toEqual([42])
    })

    it('submits the planned group context only after at least one attendee is selected', async () => {
        const { fixture, component, api, dataService } = await setup()
        component.clearAttendees()

        expect(component.disableCreateButton).toBe(true)
        component.selectAllAttendees()
        expect(component.disableCreateButton).toBe(false)

        component.notes = 'Try the group recommendation.'
        component.onClickCreateMeeting()
        await fixture.whenStable()
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(api.scheduleSession).toHaveBeenCalledWith(
            expect.objectContaining({
                groupId: 7,
                attendeeIds: [1, 2],
                plannedGameIds: [],
                notes: 'Try the group recommendation.',
                timezone: expect.any(String),
            }),
        )
        expect(dataService.refreshUserMeets).toHaveBeenCalled()
        expect(component.isCreatingLoading).toBe(false)
    })

    it('clears stale planning context when the group disappears during a refresh', async () => {
        const { fixture, component, dataService } = await setup()

        expect(component.groupData?.id).toBe(7)
        dataService.userGroups.set([])
        fixture.detectChanges()

        expect(component.groupData).toBeNull()
        expect(component.selectedAttendeeIds).toEqual([])
        expect(component.selectedPlannedGameIds).toEqual([])
        expect(component.groupUnavailable).toBe(true)
    })
})
