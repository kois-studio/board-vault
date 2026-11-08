import { HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { MeetWithAttendeesAndGamesType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { DataService } from '../../core/services/data.service'
import { ApiUnavailableError } from '../../core/utils/apiUnavailable'
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
        gameVotes: [],
        gameBringers: [],
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

    it('keeps both identity sources and their scores in mixed legacy plays', async () => {
        const { component } = await setup()
        component.groupPeople = [
            {
                person: {
                    id: 11,
                    accountId: 1,
                    displayName: 'Ana',
                    status: 'active',
                    standing: 'member',
                    avatar: null,
                },
            },
        ] as never
        component.recording = {
            groupId: 7,
            sessionDate: '2026-09-04T19:00:00Z',
            timezone: 'Europe/Madrid',
            revision: 0,
            attendeeIds: [1],
            groupPersonIds: [11],
            games: [
                {
                    gameId: 42,
                    participantIds: [1],
                    participantPersonIds: [11],
                    results: [
                        { accountId: 1, isWinner: true, score: 7 },
                        { groupPersonId: 11, isWinner: false, score: 3 },
                    ],
                },
            ],
        }
        const players = component.roundPlayers(0)
        expect(players.map((person) => person.key)).toEqual(['p11', 'a1'])
        expect(players.map((person) => component.roundScore(0, person))).toEqual([3, 7])
        expect(players[1]?.displayName).toContain('separate account entry')
    })

    describe('roles (ADR-0019)', () => {
        it('lets an invitee who is coming run the night, but not shape or cancel it', async () => {
            const { component } = await setup()
            component.userData = { id: 2 } as typeof component.userData

            expect(component.isOrganizer).toBe(false)
            expect(component.canRunNight).toBe(true)
            expect(component.canShapeNight).toBe(false)
            expect(component.canRecordAttendance).toBe(true)
        })

        it('takes the night away from someone who declined', async () => {
            const { component } = await setup()
            component.userData = { id: 2 } as typeof component.userData
            component.meetData?.attendeeStatuses.splice(1, 1, { accountId: 2, rsvpStatus: 'declined', attendanceStatus: 'unknown' })

            expect(component.canRunNight).toBe(false)
            expect(component.canRecordAttendance).toBe(false)
        })

        it('makes the group owner an organizer of every night in the group', async () => {
            const { component } = await setup()
            component.userData = { id: 3 } as typeof component.userData
            component.groupData = { ...component.groupData, createdBy: 3 } as never

            expect(component.isOrganizer).toBe(true)
            expect(component.canShapeNight).toBe(true)
            expect(component.canRunNight).toBe(true)
        })

        it('counts whoever played a game as there', async () => {
            const { component } = await setup()
            const ana = component.invitedPeople.find((person) => person.accountId === 1)

            expect(ana && component.playedAnyGame(ana)).toBe(true)
        })
    })

    describe('deciding on the night', () => {
        const scheduled = async () => {
            const context = await setup()
            const meet = context.component.meetData
            if (meet) {
                meet.status = 'scheduled'
                meet.playedGames = []
                meet.playedGameParticipants = []
                meet.attendees = [1, 2]
                meet.attendeeStatuses = [
                    { accountId: 1, rsvpStatus: 'accepted', attendanceStatus: 'unknown' },
                    { accountId: 2, rsvpStatus: 'declined', attendanceStatus: 'unknown' },
                ]
            }
            context.component.groupData = {
                ...context.component.groupData,
                members: [
                    {
                        id: 1,
                        username: 'ana',
                        displayName: 'Ana',
                        avatar: null,
                        games: [{ id: 42, titleTranslations: { en: 'Azul' } }],
                        reviews: [],
                    },
                    {
                        id: 2,
                        username: 'bo',
                        displayName: 'Bo',
                        avatar: null,
                        games: [{ id: 43, titleTranslations: { en: 'Catan' } }],
                        reviews: [],
                    },
                ],
            } as never
            return context
        }

        it('only offers the games of the people coming', async () => {
            const { component } = await scheduled()

            expect(component.comingAccountIds).toEqual([1])
            expect(component.totalGames.map((game) => [game.id, game.active])).toEqual([
                [42, true],
                [43, false],
            ])
        })

        it('asks for suggestions for the people coming, and adds one to the shortlist with your vote', async () => {
            const { component, api } = await scheduled()
            const suggestion = { gameData: { id: 43 }, score: 80, explanation: { reasons: [], lastPlayedAt: null } }
            const getRecommendations = vi
                .fn()
                .mockReturnValue(of({ groupId: 7, attendeeIds: [1], recommendations: [suggestion], noResultReason: null }))
            const proposeSessionGame = vi
                .fn()
                .mockReturnValue(of({ sessionId: 99, plannedGameIds: [42, 43], gameVotes: [{ gameId: 43, accountIds: [1] }] }))
            Object.assign(api, { getRecommendations, proposeSessionGame })

            await component.loadSuggestions()
            expect(getRecommendations).toHaveBeenCalledWith({ groupId: 7, attendeeIds: [1] })
            expect(component.topSuggestions.map((entry) => entry.gameData.id)).toEqual([43])

            await component.addSuggestionToShortlist(43)
            expect(proposeSessionGame).toHaveBeenCalledWith(99, 43)
            expect(component.meetData?.plannedGames).toEqual([42, 43])
            expect(component.hasMyVote(43)).toBe(true)
        })

        it('orders the shortlist by votes and toggles your vote', async () => {
            const { component, api } = await scheduled()
            const meet = component.meetData
            if (!meet) return
            meet.plannedGames = [42, 43]
            meet.attendeeStatuses = [
                { accountId: 1, rsvpStatus: 'accepted', attendanceStatus: 'unknown' },
                { accountId: 2, rsvpStatus: 'accepted', attendanceStatus: 'unknown' },
            ]
            meet.gameVotes = [{ gameId: 43, accountIds: [2] }]

            expect(component.plannedGames.map((game) => game.id)).toEqual([43, 42])
            expect(component.voterNames(43)).toBe('Bo')

            const setSessionGameVote = vi.fn().mockReturnValue(
                of({
                    sessionId: 99,
                    gameVotes: [
                        { gameId: 43, accountIds: [2] },
                        { gameId: 42, accountIds: [1] },
                    ],
                }),
            )
            Object.assign(api, { setSessionGameVote })
            await component.toggleVote(42)

            expect(setSessionGameVote).toHaveBeenCalledWith(99, 42, true)
            expect(component.hasMyVote(42)).toBe(true)
            expect(component.voterNames(42)).toBe('you')
        })

        it('lets you bring a shortlisted game you own, and names who brings it', async () => {
            const { component, api } = await scheduled()
            const meet = component.meetData
            if (!meet) return
            meet.plannedGames = [42, 43]

            // Ana (you) owns Azul (42) and is coming; Bo owns Catan (43) but declined.
            expect(component.canBring(42)).toBe(true)
            expect(component.canBring(43)).toBe(false)
            expect(component.comingOwners(43)).toEqual([])

            const setSessionGameBringer = vi.fn().mockReturnValue(
                of({
                    sessionId: 99,
                    gameBringers: [{ gameId: 42, accountId: 1, groupPersonId: null, copyTitle: null, copyTitleLanguage: null }],
                }),
            )
            Object.assign(api, { setSessionGameBringer })
            await component.setBringer(42, {})

            expect(setSessionGameBringer).toHaveBeenCalledWith(99, 42, {})
            expect(component.bringerOf(42)).toEqual({ name: 'Ana', isMe: true, copy: null })
            expect(component.bringerOf(43)).toBeNull()

            // A bringer whose copy is another edition than the title shown names it (ADR-0025 rule 1).
            meet.gameBringers = [{ gameId: 42, accountId: 1, groupPersonId: null, copyTitle: 'Azul (Deutsch)', copyTitleLanguage: 'de' }]
            expect(component.bringerOf(42)?.copy).toEqual({ title: 'Azul (Deutsch)', language: 'de' })
        })

        it('asks for nothing when everyone has declined', async () => {
            const { component, api } = await scheduled()
            component.meetData?.attendeeStatuses.splice(0, 1, { accountId: 1, rsvpStatus: 'declined', attendanceStatus: 'unknown' })
            const getRecommendations = vi.fn()
            Object.assign(api, { getRecommendations })

            await component.loadSuggestions()
            expect(getRecommendations).not.toHaveBeenCalled()
            expect(component.suggestionsError()).toBe(false)
        })

        it('does not suggest anything once the night has started', async () => {
            const { component } = await setup()

            await component.loadSuggestions()
            expect(component.suggestions()).toBeNull()
        })
    })

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

        expect(await component.onClickMember(1)).toBe(false)

        expect(component.isAttendeeRemovalBlocked(1)).toBe(true)
        expect(component.hasPlayedGameAttendeeLock).toBe(false)
        expect(dataService.updateSessionAttendees).not.toHaveBeenCalled()
        expect(toastService.error).toHaveBeenCalledWith('A session must retain at least one attendee.')
    })

    it('blocks removing an attendee recorded for a played game', async () => {
        const { component, dataService, toastService } = await setup()

        expect(await component.onClickMember(1)).toBe(false)

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

    it('keeps the group people invited as stored when a change is not saved, and says so', async () => {
        const { component, api, toastService } = await setup()
        const meetData = component.meetData
        if (!meetData) throw new Error('no night')
        meetData.participants = [12, 13]
        meetData.playedGamePersonParticipants = []
        component.groupPeople = [
            { person: { id: 12, accountId: null, displayName: 'Ana' } as never, ownership: [], preferences: [], claimable: false },
            { person: { id: 13, accountId: 1, displayName: 'Carlos' } as never, ownership: [], preferences: [], claimable: false },
        ]
        api.updateSessionAttendees.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 503 })))

        await component.onClickGroupPerson(12)

        expect(api.updateSessionAttendees).toHaveBeenCalledWith(99, { groupPersonIds: [13] })
        expect(component.meetData?.participants).toEqual([12, 13])
        expect(component.inviteSaveError()).toEqual({ key: 'p12', name: 'Ana', adding: false, maybeSaved: false, checked: false })
        expect(component.inviteSaveErrorMessage).toBe('Couldn’t take Ana off the night. Try again.')
        expect(component.isPersistingChanges).toBe(false)
        expect(toastService.error).not.toHaveBeenCalled()
    })

    it('reads the group people invited again when it could not confirm the save', async () => {
        const { component, api } = await setup()
        const meetData = component.meetData
        if (!meetData) throw new Error('no night')
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
        // The removal was saved after all: the night as stored no longer has Ana.
        const stored = { ...structuredClone(meetData), participants: [13] }
        const getSessionDetailsById = vi.fn().mockReturnValue(of(stored))
        Object.assign(api, { getSessionDetailsById })
        api.updateSessionAttendees.mockReturnValue(
            throwError(() => new ApiUnavailableError({ kind: 'timeout', outcomeUnknown: true, url: '/sessions/99/attendees' })),
        )

        expect(await component.onClickGroupPerson(12)).toBe(true)

        expect(getSessionDetailsById).toHaveBeenCalledWith(99)
        expect(component.meetData?.participants).toEqual([13])
        expect(component.meetDataCopyOriginal?.participants).toEqual([13])
        expect(component.inviteSaveErrorMessage).toBe('We couldn’t confirm the change for Ana was saved. The list shows what is stored.')
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
    // Some tests fake the clock; give it back even when one fails, so the fake date never leaks into the next.
    afterEach(() => vi.useRealTimers())

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
        gameVotes: [],
        gameBringers: [],
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

    it('asks for results instead of answers once a planned night is over, and starts it without asking', async () => {
        vi.useFakeTimers({ now: new Date('2026-10-24T10:00:00.000Z'), toFake: ['Date'] })
        const { fixture, button, statusResponse } = await setup()
        const element = fixture.nativeElement as HTMLElement

        expect(element.textContent).toContain('Waiting for results')
        expect(element.textContent).toContain('This night is over.')
        expect(element.textContent).not.toContain('Can you make it?')
        expect(element.textContent).not.toContain('Add to calendar')
        expect(button('Start game night')).toBeUndefined()

        button('Record results')?.click()
        await fixture.whenStable()
        expect(element.textContent).not.toContain('Start this game night now?')
        expect(button('Record results')?.disabled).toBe(true)

        // The night keeps its date: the API only moves a night that starts early.
        statusResponse.next({ sessionId: 59, status: 'active', sessionDate: '2026-10-14T17:00:00.000Z' })
        statusResponse.complete()
        await fixture.whenStable()
        expect(button('Finish game night')?.disabled).toBe(false)
        vi.useRealTimers()
    })

    it('still treats a night as planned on its evening, until twelve hours after it starts', async () => {
        vi.useFakeTimers({ now: new Date('2026-10-15T04:00:00.000Z'), toFake: ['Date'] })
        const { fixture, button } = await setup()
        const element = fixture.nativeElement as HTMLElement

        expect(element.textContent).toContain('Can you make it?')
        expect(button('Start game night')).toBeDefined()
        expect(button('Record results')).toBeUndefined()
        vi.useRealTimers()
    })

    it('marks you as going and frees the RSVP buttons once the RSVP is saved', async () => {
        vi.useFakeTimers({ now: new Date('2026-10-10T18:00:00.000Z'), toFake: ['Date'] })
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
        vi.useRealTimers()
    })
})

describe('MeetViewComponent invite changes that are not saved', () => {
    const night = (attendees: Array<number>): MeetWithAttendeesAndGamesType => ({
        id: 59,
        groupId: 7,
        createdBy: 1,
        meetDate: '2026-12-14T17:00:00.000Z',
        isConfirmed: false,
        status: 'scheduled',
        timezone: 'Europe/Madrid',
        notes: null,
        attendees,
        attendeeStatuses: attendees.map((accountId) => ({
            accountId,
            rsvpStatus: 'pending' as const,
            attendanceStatus: 'unknown' as const,
        })),
        playedGames: [],
        plannedGames: [],
        skippedGames: [],
        playedGameParticipants: [],
        gameVotes: [],
        gameBringers: [],
    })

    const setup = async (attendees: Array<number> = [1]) => {
        const saveResponse = new Subject<{ sessionId: number; attendeeIds: Array<number> }>()
        const api = {
            getSessionDetailsById: vi.fn().mockReturnValue(of(night(attendees))),
            getGroupPeople: vi.fn().mockReturnValue(of({ people: [] })),
            getGroupPersonCatalog: vi.fn().mockReturnValue(of({ people: [] })),
            updateSessionAttendees: vi.fn().mockReturnValue(saveResponse),
        }
        const toastService = { success: vi.fn(), error: vi.fn() }
        await TestBed.configureTestingModule({
            imports: [MeetViewComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ sessionId: '59' }) } } },
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal({ id: 1, username: 'ana', displayName: 'Ana', avatar: null }),
                        userGroups: signal([
                            {
                                id: 7,
                                name: 'Thursday group',
                                createdBy: 1,
                                members: [
                                    { id: 1, username: 'ana', displayName: 'Ana', avatar: null, games: [], reviews: [] },
                                    { id: 2, username: 'bo', displayName: 'Bo', avatar: null, games: [], reviews: [] },
                                ],
                                games: [],
                            },
                        ]),
                        userReviews: signal([]),
                        refreshUserMeets: vi.fn(),
                        refreshUserHistory: vi.fn(),
                    },
                },
                { provide: ToastService, useValue: toastService },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(MeetViewComponent)
        fixture.autoDetectChanges()
        /** Lets the answers pushed by a test reach the page (they resolve in microtasks), then renders. */
        const settle = async () => {
            await new Promise((resolve) => setTimeout(resolve))
            await fixture.whenStable()
        }
        await settle()
        const element = fixture.nativeElement as HTMLElement
        const people = element.querySelector('[aria-labelledby="people-heading"]') as HTMLElement
        const editorToggle = people.querySelector('button[aria-expanded]') as HTMLButtonElement
        editorToggle.click()
        await settle()
        const chip = (name: string) =>
            [...people.querySelectorAll<HTMLButtonElement>('[role="group"] button')].find(
                (button) => button.textContent?.trim() === name,
            ) as HTMLButtonElement
        const message = () => people.querySelector('[data-testid="invite-save-error"]')
        /**
         * Presses a chip the way a person does: saving disables it, and the browser then moves focus to the page.
         * jsdom keeps focus on a disabled button and won't blur it, so focus goes to a passing button that leaves.
         */
        const press = async (name: string) => {
            chip(name).focus()
            chip(name).click()
            const elsewhere = document.body.appendChild(document.createElement('button'))
            elsewhere.focus()
            elsewhere.remove()
            expect(document.activeElement).toBe(document.body)
            await settle()
        }
        return { fixture, settle, people, editorToggle, chip, message, press, api, saveResponse, toastService }
    }

    it('keeps the chip as stored while it saves, then shows the saved invite and gives focus back', async () => {
        const { settle, chip, message, press, saveResponse } = await setup()

        await press('Bo')

        expect(chip('Bo').getAttribute('aria-pressed')).toBe('false')
        expect(chip('Bo').getAttribute('aria-busy')).toBe('true')
        expect(chip('Bo').disabled).toBe(true)
        expect(chip('Ana').getAttribute('aria-busy')).toBeNull()

        saveResponse.next({ sessionId: 59, attendeeIds: [1, 2] })
        saveResponse.complete()
        await settle()

        expect(chip('Bo').getAttribute('aria-pressed')).toBe('true')
        expect(chip('Bo').getAttribute('aria-busy')).toBeNull()
        expect(chip('Bo').disabled).toBe(false)
        expect(message()).toBeNull()
        expect(document.activeElement).toBe(chip('Bo'))
    })

    it('says an invite that was not saved, keeps the chips as stored and gives focus back', async () => {
        const { settle, chip, message, press, api, saveResponse, toastService } = await setup()

        await press('Bo')
        saveResponse.error(new HttpErrorResponse({ status: 503, url: '/sessions/59/attendees' }))
        await settle()

        expect(chip('Bo').getAttribute('aria-pressed')).toBe('false')
        expect(chip('Bo').disabled).toBe(false)
        expect(message()?.getAttribute('role')).toBe('alert')
        expect(message()?.textContent?.trim()).toBe('Couldn’t add Bo to the night. Try again.')
        expect(chip('Bo').getAttribute('aria-describedby')).toBe(message()?.id)
        expect(chip('Ana').getAttribute('aria-describedby')).toBeNull()
        expect(document.activeElement).toBe(chip('Bo'))
        // Not read again: the change was not saved, so the chips already show what is stored.
        expect(api.getSessionDetailsById).toHaveBeenCalledTimes(1)
        expect(toastService.error).not.toHaveBeenCalled()
    })

    it('says a removal that was not saved and keeps the person invited', async () => {
        const { settle, people, chip, message, press, saveResponse } = await setup([1, 2])

        await press('Bo')
        saveResponse.error(new HttpErrorResponse({ status: 500 }))
        await settle()

        expect(chip('Bo').getAttribute('aria-pressed')).toBe('true')
        expect(message()?.textContent?.trim()).toBe('Couldn’t take Bo off the night. Try again.')
        expect(people.querySelector('ul')?.textContent).toContain('Bo')
    })

    it('reads the night again when it could not confirm the save, and keeps the chips locked meanwhile', async () => {
        const { fixture, settle, chip, message, press, api, saveResponse } = await setup()
        const stored = new Subject<MeetWithAttendeesAndGamesType>()
        api.getSessionDetailsById.mockReturnValue(stored)

        await press('Bo')
        saveResponse.error(new ApiUnavailableError({ kind: 'timeout', outcomeUnknown: true, url: '/sessions/59/attendees' }))
        await settle()

        expect(api.getSessionDetailsById).toHaveBeenCalledTimes(2)
        expect(api.getSessionDetailsById).toHaveBeenLastCalledWith(59)
        expect(chip('Bo').disabled).toBe(true)
        expect(message()).toBeNull()
        // No change goes out while the night is read again: it would be based on a list that may be out of date.
        await fixture.componentInstance.onClickMember(2)
        expect(api.updateSessionAttendees).toHaveBeenCalledTimes(1)
        // An answer saved meanwhile (RSVP and attendance save on their own) is not undone by the re-read.
        const ana = fixture.componentInstance.meetData?.attendeeStatuses.find((status) => status.accountId === 1)
        if (ana) ana.rsvpStatus = 'accepted'

        stored.next(night([1, 2]))
        stored.complete()
        await settle()

        expect(fixture.componentInstance.meetData?.attendeeStatuses.find((status) => status.accountId === 1)?.rsvpStatus).toBe('accepted')

        expect(chip('Bo').getAttribute('aria-pressed')).toBe('true')
        expect(chip('Bo').disabled).toBe(false)
        expect(message()?.textContent?.trim()).toBe('We couldn’t confirm the change for Bo was saved. The list shows what is stored.')
        expect(document.activeElement).toBe(chip('Bo'))
    })

    it('asks for a reload when the night cannot be read again either', async () => {
        const { settle, chip, message, press, api, saveResponse } = await setup()
        api.getSessionDetailsById.mockReturnValue(throwError(() => new HttpErrorResponse({ status: 0 })))

        await press('Bo')
        saveResponse.error(new ApiUnavailableError({ kind: 'network', outcomeUnknown: true, url: '/sessions/59/attendees' }))
        await settle()

        expect(chip('Bo').getAttribute('aria-pressed')).toBe('false')
        expect(message()?.textContent?.trim()).toBe(
            'We couldn’t confirm the change for Bo was saved. Reload the page to see what is stored.',
        )
    })

    it('puts the message away on the next change and when the editor closes', async () => {
        const { settle, editorToggle, chip, message, press, api, saveResponse } = await setup()
        await press('Bo')
        saveResponse.error(new HttpErrorResponse({ status: 503 }))
        await settle()
        expect(message()).not.toBeNull()

        const retry = new Subject<{ sessionId: number; attendeeIds: Array<number> }>()
        api.updateSessionAttendees.mockReturnValue(retry)
        await press('Bo')
        expect(message()).toBeNull()
        retry.error(new HttpErrorResponse({ status: 503 }))
        await settle()
        expect(message()).not.toBeNull()

        editorToggle.click()
        await settle()
        editorToggle.click()
        await settle()
        expect(chip('Bo')).toBeDefined()
        expect(message()).toBeNull()
    })

    it('still says a change was not saved when the editor was closed while it saved', async () => {
        const { settle, people, editorToggle, message, press, saveResponse } = await setup()
        await press('Bo')
        editorToggle.click()
        await settle()
        expect(people.querySelector('[role="group"]')).toBeNull()

        saveResponse.error(new HttpErrorResponse({ status: 503 }))
        await settle()

        expect(message()?.textContent?.trim()).toBe('Couldn’t add Bo to the night. Try again.')
    })

    it('gives no focus back when no save ran', async () => {
        const { fixture, settle, api } = await setup()
        const component = fixture.componentInstance
        const ana = component.invitablePeople.find((person) => person.displayName === 'Ana')
        if (!ana) throw new Error('Ana is not in the invite editor')
        // Ana's own chip is disabled (she can't be taken off), and a disabled button takes no focus anyway: an enabled
        // stand-in shows whether focus would be given back.
        const standIn = document.body.appendChild(document.createElement('button'))

        // Ana is the only one invited, so she can't be taken off: nothing is sent.
        await component.toggleInvite(ana, standIn)
        const elsewhere = document.body.appendChild(document.createElement('button'))
        elsewhere.focus()
        elsewhere.remove()
        fixture.changeDetectorRef.markForCheck()
        await settle()

        expect(api.updateSessionAttendees).not.toHaveBeenCalled()
        expect(document.activeElement).toBe(document.body)
        standIn.remove()
    })

    it('leaves focus where it was moved while it saved', async () => {
        const { settle, editorToggle, chip, press, saveResponse } = await setup()
        await press('Bo')
        editorToggle.focus()

        saveResponse.error(new HttpErrorResponse({ status: 503 }))
        await settle()

        expect(chip('Bo').disabled).toBe(false)
        expect(document.activeElement).toBe(editorToggle)
    })

    it('answers quietly when the page was left while it saved', async () => {
        const { fixture, chip, saveResponse } = await setup()
        const component = fixture.componentInstance
        const bo = component.invitablePeople.find((person) => person.displayName === 'Bo')
        if (!bo) throw new Error('Bo is not in the invite editor')
        const saved = component.toggleInvite(bo, chip('Bo'))

        fixture.destroy()
        saveResponse.error(new ApiUnavailableError({ kind: 'timeout', outcomeUnknown: true, url: '/sessions/59/attendees' }))

        // No focus is scheduled on the page that was left (afterNextRender would throw NG0911 there).
        await expect(saved).resolves.toBeUndefined()
    })
})
