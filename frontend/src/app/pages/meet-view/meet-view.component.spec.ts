import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
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
        gameResults: [],
    })

    const setup = async () => {
        const api = {
            updateSessionAttendees: vi.fn().mockName('updateSessionAttendees'),
            updateSessionAttendance: vi.fn().mockName('updateSessionAttendance'),
            updateSessionPlayedGames: vi.fn().mockName('updateSessionPlayedGames'),
            updateSessionStatus: vi.fn().mockName('updateSessionStatus'),
            updateGameResults: vi.fn().mockName('updateGameResults'),
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
        component.groupData = {
            id: 7,
            name: 'Friday crew',
            members: [
                { id: 1, username: 'ana', displayName: 'Ana', avatar: null, games: [], reviews: [] },
                { id: 2, username: 'bo', displayName: '', avatar: null, games: [], reviews: [] },
            ],
        } as never
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
        api.updateSessionStatus.mockReturnValue(of({ sessionId: 99, status: 'completed', sessionDate: '2026-08-16T19:30:00.000Z' }))

        await component.updateStatus('completed')

        expect(dataService.refreshUserMeets).toHaveBeenCalledOnce()
        expect(dataService.refreshUserHistory).toHaveBeenCalledOnce()
    })

    it('leaves the cached history alone when a session is cancelled', async () => {
        const { component, api, dataService } = await setup()
        api.updateSessionStatus.mockReturnValue(of({ sessionId: 99, status: 'cancelled', sessionDate: '2026-08-16T19:30:00.000Z' }))

        await component.updateStatus('cancelled')

        expect(dataService.refreshUserMeets).toHaveBeenCalledOnce()
        expect(dataService.refreshUserHistory).not.toHaveBeenCalled()
    })

    it('offers to cancel a night with nothing played, and confirms when finishing it anyway', async () => {
        const { component, api } = await setup()
        api.updateSessionStatus.mockReturnValue(of({ sessionId: 99, status: 'completed', sessionDate: '2026-08-16T19:30:00.000Z' }))
        const meetData = component.meetData
        if (!meetData) return
        meetData.status = 'active'
        meetData.playedGames = []

        component.requestStatusUpdate('completed')
        component.confirmStatusUpdate('cancelled')
        expect(api.updateSessionStatus).toHaveBeenLastCalledWith(99, { status: 'cancelled' })
        await vi.waitFor(() => expect(component.isUpdatingStatus).toBe(false))

        meetData.status = 'active'
        component.requestStatusUpdate('completed')
        component.confirmStatusUpdate()
        expect(api.updateSessionStatus).toHaveBeenLastCalledWith(99, { status: 'completed', noGamesPlayed: true })
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
            games: [{ gameId: 42, participantPersonIds: [12] }],
        })
        expect(component.getGameParticipantPersonIds(42)).toEqual([12])

        await component.toggleGroupPersonGameParticipant(42, 12)
        expect(api.updateSessionPlayedGames).toHaveBeenCalledTimes(1)
        expect(toastService.error).toHaveBeenCalledWith('Keep at least one participant for each played game.')
    })

    describe('game results', () => {
        it('lists the players of a game and who won', async () => {
            const { component } = await setup()
            const meetData = component.meetData
            if (!meetData) throw new Error('missing meet')
            meetData.gameResults = [
                {
                    gameId: 42,
                    results: [
                        { accountId: 2, groupPersonId: null, isWinner: true, score: 31 },
                        { accountId: 1, groupPersonId: null, isWinner: false, score: 40 },
                    ],
                },
            ]

            expect(component.playersOf(42).map((person) => person.displayName)).toEqual(['Ana', 'bo'])
            expect(component.winnersSummary(42)).toBe('bo won')
            expect(component.scoresOf(42).map((entry) => [entry.person.key, entry.score])).toEqual([
                ['a1', 40],
                ['a2', 31],
            ])
        })

        it('names every winner of a shared win', async () => {
            const { component } = await setup()
            const meetData = component.meetData
            if (!meetData) throw new Error('missing meet')
            meetData.gameResults = [
                {
                    gameId: 42,
                    results: [
                        { accountId: 1, groupPersonId: null, isWinner: true, score: null },
                        { accountId: 2, groupPersonId: null, isWinner: true, score: null },
                    ],
                },
            ]

            expect(component.winnersSummary(42)).toBe('Ana and bo won')
        })

        it('saves winners and scores, leaving out players with neither', async () => {
            const { component, api, dataService, toastService } = await setup()
            api.updateGameResults.mockReturnValue(
                of({ sessionId: 99, gameId: 42, results: [{ accountId: 1, groupPersonId: null, isWinner: true, score: 12 }] }),
            )

            component.startEditingResults(42)
            component.toggleDraftWinner('a1')
            component.setDraftScore('a1', '12')
            component.setDraftScore('a2', '')
            await component.saveResults()

            expect(api.updateGameResults).toHaveBeenCalledWith(99, 42, { results: [{ accountId: 1, isWinner: true, score: 12 }] })
            expect(component.meetData?.gameResults).toEqual([
                { gameId: 42, results: [{ accountId: 1, groupPersonId: null, isWinner: true, score: 12 }] },
            ])
            expect(component.editingResultsGameId).toBeNull()
            expect(dataService.refreshUserHistory).toHaveBeenCalledOnce()
            expect(toastService.success).toHaveBeenCalledWith('Results saved.')
        })

        it('keeps the form open when saving fails', async () => {
            const { component, api, toastService } = await setup()
            api.updateGameResults.mockReturnValue(throwError(() => new Error('temporary failure')))

            component.startEditingResults(42)
            component.toggleDraftWinner('a2')
            await component.saveResults()

            expect(component.editingResultsGameId).toBe(42)
            expect(component.resultsDraft['a2']).toEqual({ isWinner: true, score: null })
            expect(toastService.error).toHaveBeenCalledWith('Could not save the results.')
        })

        it('drops the result of a player taken out of the game', async () => {
            const { component, api } = await setup()
            const meetData = component.meetData
            if (!meetData) throw new Error('missing meet')
            meetData.gameResults = [{ gameId: 42, results: [{ accountId: 2, groupPersonId: null, isWinner: true, score: null }] }]
            api.updateSessionPlayedGames.mockReturnValue(
                of({
                    sessionId: 99,
                    playedGameIds: [42],
                    skippedGameIds: [],
                    playedGameParticipants: [{ gameId: 42, participantIds: [1] }],
                }),
            )

            await component.toggleGameParticipant(42, 2)

            expect(component.meetData?.gameResults).toEqual([])
        })

        it('only lets people record results once the night has started', async () => {
            const { component } = await setup()
            const meetData = component.meetData
            if (!meetData) throw new Error('missing meet')

            expect(component.canRecordResults).toBe(true)
            meetData.status = 'completed'
            expect(component.canRecordResults).toBe(true)
            meetData.status = 'cancelled'
            expect(component.canRecordResults).toBe(false)
        })
    })

    it('offers the calendar only before the night is over', async () => {
        const { component } = await setup()
        const meetData = component.meetData
        if (!meetData) throw new Error('missing meet')

        expect(component.canAddToCalendar).toBe(true)
        expect(component.googleCalendarLink).toContain('Game+night')
        meetData.status = 'completed'
        expect(component.canAddToCalendar).toBe(false)
    })
})

// Contributed in #71: the page must re-render when a request answers after the click (OnPush).
describe('MeetViewComponent rendered lifecycle actions', () => {
    const scheduledMeet = (): MeetWithAttendeesAndGamesType => ({
        id: 59,
        groupId: 7,
        createdBy: 1,
        meetDate: '2026-10-14T17:00:00.000Z',
        isConfirmed: false,
        status: 'scheduled',
        timezone: 'Europe/Madrid',
        notes: null,
        attendees: [1],
        attendeeStatuses: [{ accountId: 1, rsvpStatus: 'pending', attendanceStatus: 'unknown' }],
        playedGames: [],
        plannedGames: [],
        skippedGames: [],
        playedGameParticipants: [],
    })

    const setup = async () => {
        const statusResponse = new Subject<{ sessionId: number; status: 'active'; sessionDate: string }>()
        const rsvpResponse = new Subject<{ sessionId: number; rsvpStatus: 'accepted' }>()
        const api = {
            getSessionDetailsById: vi.fn().mockReturnValue(of(scheduledMeet())),
            getGroupPeople: vi.fn().mockReturnValue(of({ people: [] })),
            getGroupPersonCatalog: vi.fn().mockReturnValue(of({ people: [] })),
            updateSessionStatus: vi.fn().mockReturnValue(statusResponse),
            updateSessionRsvp: vi.fn().mockReturnValue(rsvpResponse),
        }
        const dataService = {
            currentUser: signal({ id: 1, username: 'ana', displayName: 'Ana', avatar: null }),
            userGroups: signal([
                {
                    id: 7,
                    name: 'Thursday group',
                    createdBy: 1,
                    members: [{ id: 1, username: 'ana', displayName: 'Ana', avatar: null, games: [], reviews: [] }],
                    games: [],
                },
            ]),
            userReviews: signal([]),
            refreshUserMeets: vi.fn(),
            refreshUserHistory: vi.fn(),
        }

        await TestBed.configureTestingModule({
            imports: [MeetViewComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ sessionId: '59' }) } } },
                { provide: DataService, useValue: dataService },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(MeetViewComponent)
        fixture.autoDetectChanges()
        await fixture.whenStable()
        const element = fixture.nativeElement as HTMLElement
        const button = (name: string) => [...element.querySelectorAll('button')].find((b) => b.textContent?.trim() === name)
        return { fixture, button, statusResponse, rsvpResponse, dataService }
    }

    it('asks before starting a night ahead of its date, then shows it live and dated now', async () => {
        vi.useFakeTimers({ now: new Date('2026-10-10T18:00:00.000Z'), toFake: ['Date'] })
        const { fixture, button, statusResponse } = await setup()

        button('Start game night')?.click()
        await fixture.whenStable()
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Start this game night now?')

        button('Start now')?.click()
        await fixture.whenStable()
        expect(button('Start game night')?.disabled).toBe(true)

        statusResponse.next({ sessionId: 59, status: 'active', sessionDate: '2026-10-10T18:00:00.000Z' })
        statusResponse.complete()
        await fixture.whenStable()

        expect(button('Start game night')).toBeUndefined()
        expect(button('Finish game night')?.disabled).toBe(false)
        expect(button('Cancel game night')?.disabled).toBe(false)
        vi.useRealTimers()
    })

    it('starts a night on or after its date without asking', async () => {
        vi.useFakeTimers({ now: new Date('2026-10-14T17:30:00.000Z'), toFake: ['Date'] })
        const { fixture, button } = await setup()

        button('Start game night')?.click()
        await fixture.whenStable()

        expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Start this game night now?')
        expect(button('Start game night')?.disabled).toBe(true)
        vi.useRealTimers()
    })

    it('marks you as going and frees the RSVP buttons once the RSVP is saved', async () => {
        const { fixture, button, rsvpResponse, dataService } = await setup()

        button('I’m going')?.click()
        await fixture.whenStable()
        expect(button('I’m going')?.disabled).toBe(true)

        rsvpResponse.next({ sessionId: 59, rsvpStatus: 'accepted' })
        rsvpResponse.complete()
        await fixture.whenStable()

        expect(button('I’m going')?.getAttribute('aria-pressed')).toBe('true')
        expect(button('I’m going')?.disabled).toBe(false)
        expect(button('Can’t make it')?.disabled).toBe(false)
        // Home and Upcoming list your answer too.
        expect(dataService.refreshUserMeets).toHaveBeenCalled()
    })
})
