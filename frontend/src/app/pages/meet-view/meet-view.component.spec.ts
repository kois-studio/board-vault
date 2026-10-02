import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap } from '@angular/router'
import { of, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { MeetWithAttendeesAndGamesType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { DataService } from '../../core/services/data.service'
import { MeetViewComponent } from './meet-view.component'

describe('MeetViewComponent participant safeguards', () => {
    const createMeet = (): MeetWithAttendeesAndGamesType => ({
        id: 99,
        groupId: 7,
        createdBy: 1,
        meetDate: '2026-09-04T19:00:00.000Z',
        isConfirmed: true,
        status: 'active',
        timezone: 'Europe/Madrid',
        notes: null,
        attendees: [1, 2],
        attendeeStatuses: [
            { accountId: 1, rsvpStatus: 'accepted', attendanceStatus: 'attended' },
            { accountId: 2, rsvpStatus: 'accepted', attendanceStatus: 'attended' },
        ],
        playedGames: [42],
        plannedGames: [42],
        skippedGames: [],
        playedGameParticipants: [{ gameId: 42, participantIds: [1, 2] }],
    })

    const setup = async () => {
        const api = {
            updateSessionAttendees: vi.fn().mockName('updateSessionAttendees'),
            updateSessionAttendance: vi.fn().mockName('updateSessionAttendance'),
            updateSessionPlayedGames: vi.fn().mockName('updateSessionPlayedGames'),
            updateSessionStatus: vi.fn().mockName('updateSessionStatus'),
        }
        const dataService = {
            currentUser: signal(null),
            userGroups: signal([]),
            userReviews: signal([]),
            updateSessionAttendees: vi.fn().mockName('updateSessionAttendees'),
            refreshGameReviews: vi.fn().mockName('refreshGameReviews'),
            refreshUserMeets: vi.fn().mockName('refreshUserMeets'),
            refreshUserHistory: vi.fn().mockName('refreshUserHistory'),
        }
        const toastService = {
            success: vi.fn().mockName('success'),
            error: vi.fn().mockName('error'),
        }

        await TestBed.configureTestingModule({
            imports: [MeetViewComponent],
            providers: [
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ sessionId: '99' }) } } },
                {
                    provide: DataService,
                    useValue: dataService,
                },
                { provide: ToastService, useValue: toastService },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(MeetViewComponent)
        const component = fixture.componentInstance
        component.userData = { id: 1 } as typeof component.userData
        component.meetData = createMeet()
        component.meetDataCopyOriginal = structuredClone(component.meetData)
        return { component, api, dataService, toastService }
    }

    it('does not allow a played game to lose its final participant', async () => {
        const { component, api, toastService } = await setup()
        const meetData = component.meetData
        expect(meetData).not.toBeNull()
        if (!meetData) return
        meetData.playedGameParticipants = [{ gameId: 42, participantIds: [1] }]

        await component.toggleGameParticipant(42, 1)

        expect(component.getGameParticipantIds(42)).toEqual([1])
        expect(api.updateSessionPlayedGames).not.toHaveBeenCalled()
        expect(toastService.error).toHaveBeenCalledWith('Keep at least one participant for each played game.')
    })

    it('keeps skipped games distinct from the played count', async () => {
        const { component } = await setup()
        const meetData = component.meetData
        expect(meetData).not.toBeNull()
        if (!meetData) return
        meetData.skippedGames = [43, 44]

        expect(component.playedGamesCount).toBe(1)
        expect(component.skippedGamesCount).toBe(2)
    })

    it('reloads the cached history when a session is completed', async () => {
        const { component, api, dataService } = await setup()
        api.updateSessionStatus.mockReturnValue(of({ sessionId: 99, status: 'completed' }))

        await component.updateStatus('completed')

        expect(dataService.refreshUserMeets).toHaveBeenCalledOnce()
        expect(dataService.refreshUserHistory).toHaveBeenCalledOnce()
    })

    it('leaves the cached history alone when a session is cancelled', async () => {
        const { component, api, dataService } = await setup()
        api.updateSessionStatus.mockReturnValue(of({ sessionId: 99, status: 'cancelled' }))

        await component.updateStatus('cancelled')

        expect(dataService.refreshUserMeets).toHaveBeenCalledOnce()
        expect(dataService.refreshUserHistory).not.toHaveBeenCalled()
    })

    it('requires an explicit review before completing or cancelling', async () => {
        const { component } = await setup()

        component.requestStatusUpdate('completed')
        expect(component.pendingStatus()).toBe('completed')
        component.cancelStatusUpdate()
        expect(component.pendingStatus()).toBeNull()
    })

    it('blocks removing the only attendee before sending an invalid request', async () => {
        const { component, dataService, toastService } = await setup()
        const meetData = component.meetData
        expect(meetData).not.toBeNull()
        if (!meetData) return
        meetData.attendees = [1]
        meetData.playedGameParticipants = []

        await component.onClickMember(1)

        expect(component.isAttendeeRemovalBlocked(1)).toBe(true)
        expect(component.hasPlayedGameAttendeeLock).toBe(false)
        expect(dataService.updateSessionAttendees).not.toHaveBeenCalled()
        expect(toastService.error).toHaveBeenCalledWith('A session must retain at least one attendee.')
    })

    it('blocks removing an attendee recorded for a played game', async () => {
        const { component, dataService, toastService } = await setup()

        await component.onClickMember(1)

        expect(component.isAttendeeRemovalBlocked(1)).toBe(true)
        expect(component.hasPlayedGameAttendeeLock).toBe(true)
        expect(dataService.updateSessionAttendees).not.toHaveBeenCalled()
        expect(toastService.error).toHaveBeenCalledWith('Remove this person from played games before removing them from the session.')
    })

    it('restores the participant selection when saving fails', async () => {
        const { component, api, toastService } = await setup()
        api.updateSessionPlayedGames.mockReturnValue(throwError(() => new Error('temporary failure')))

        await component.toggleGameParticipant(42, 1)

        expect(component.getGameParticipantIds(42)).toEqual([1, 2])
        expect(component.isPersistingChanges).toBe(false)
        expect(toastService.error).toHaveBeenCalledWith('Could not save the played game changes.')
    })

    it('saves group-person attendee changes through the participant contract', async () => {
        const { component, api } = await setup()
        const meetData = component.meetData
        expect(meetData).not.toBeNull()
        if (!meetData) return

        meetData.participants = [12, 13]
        meetData.participantStatuses = [
            { groupPersonId: 12, rsvpStatus: 'accepted', attendanceStatus: 'unknown' },
            { groupPersonId: 13, rsvpStatus: 'pending', attendanceStatus: 'unknown' },
        ]
        meetData.playedGamePersonParticipants = []
        component.groupPeople = [
            { person: { id: 12, accountId: null, displayName: 'Ana' } as never, ownership: [], preferences: [], claimable: false },
            { person: { id: 13, accountId: 1, displayName: 'Carlos' } as never, ownership: [], preferences: [], claimable: false },
        ]
        api.updateSessionAttendees.mockReturnValue(of({ sessionId: 99, attendeeIds: [], groupPersonIds: [13] }))

        await component.onClickGroupPerson(12)

        expect(api.updateSessionAttendees).toHaveBeenCalledWith(99, { groupPersonIds: [13] })
        expect(component.meetData?.participants).toEqual([13])
    })

    it('sends group-person participants for a played game and blocks the last one', async () => {
        const { component, api, toastService } = await setup()
        const meetData = component.meetData
        expect(meetData).not.toBeNull()
        if (!meetData) return

        meetData.participants = [12, 13]
        meetData.participantStatuses = [
            { groupPersonId: 12, rsvpStatus: 'accepted', attendanceStatus: 'attended' },
            { groupPersonId: 13, rsvpStatus: 'accepted', attendanceStatus: 'attended' },
        ]
        meetData.playedGamePersonParticipants = [{ gameId: 42, participantIds: [12, 13] }]
        api.updateSessionPlayedGames.mockReturnValue(
            of({
                sessionId: 99,
                playedGameIds: [42],
                skippedGameIds: [],
                playedGameParticipants: [],
                playedGamePersonParticipants: [{ gameId: 42, participantIds: [12] }],
            }),
        )

        await component.toggleGroupPersonGameParticipant(42, 13)

        expect(api.updateSessionPlayedGames).toHaveBeenCalledWith(99, {
            playedGameIds: [42],
            games: [{ gameId: 42, participantIds: [], participantPersonIds: [12] }],
        })
        expect(component.getGameParticipantPersonIds(42)).toEqual([12])

        await component.toggleGroupPersonGameParticipant(42, 12)
        expect(api.updateSessionPlayedGames).toHaveBeenCalledTimes(1)
        expect(toastService.error).toHaveBeenCalledWith('Keep at least one participant for each played game.')
    })
})
