import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { DataService } from '../../core/services/data.service'
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
            scheduleSession: jasmine.createSpy('scheduleSession').and.returnValue(of({ id: 99 })),
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
            refreshUserMeets: jasmine.createSpy('refreshUserMeets'),
        }

        await TestBed.configureTestingModule({
            imports: [MeetNewComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: routerData },
                { provide: DataService, useValue: dataService },
                { provide: ToastService, useValue: { success: jasmine.createSpy('success'), error: jasmine.createSpy('error') } },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(MeetNewComponent)
        fixture.detectChanges()
        return { fixture, component: fixture.componentInstance, api, dataService }
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

        expect(component.disableCreateButton).toBeTrue()
        component.selectAllAttendees()
        expect(component.disableCreateButton).toBeFalse()

        component.notes = 'Try the group recommendation.'
        component.onClickCreateMeeting()
        await fixture.whenStable()
        await new Promise((resolve) => setTimeout(resolve, 0))

        expect(api.scheduleSession).toHaveBeenCalledWith(
            jasmine.objectContaining({
                groupId: 7,
                attendeeIds: [1, 2],
                plannedGameIds: [],
                notes: 'Try the group recommendation.',
                timezone: jasmine.any(String),
            }),
        )
        expect(dataService.refreshUserMeets).toHaveBeenCalled()
        expect(component.isCreatingLoading).toBeFalse()
    })
})
