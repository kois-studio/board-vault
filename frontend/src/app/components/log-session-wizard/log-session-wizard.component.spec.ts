import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { isObservable, type Observable, of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType, GroupWithMembersAndGames, SessionRecording } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { ApiUnavailableError } from '../../core/utils/apiUnavailable'
import { ToastService } from '../toast/toast.service'
import { LogSessionWizardComponent } from './log-session-wizard.component'

const game = (id: number, title: string): GameCompleteType =>
    ({
        id,
        title,
        titleTranslations: { en: title, es: title },
        imageUrl: '',
        gameAvgDuration: 30,
        minPlayers: 2,
        maxPlayers: 4,
    }) as GameCompleteType
const davidAvatar = { backgroundColor: '#10B981', iconName: null, emoji: '🚀', type: 'emoji' as const, initials: '' }
const bloodyAvatar = { backgroundColor: '#EF4444', iconName: null, emoji: '😎', type: 'emoji' as const, initials: '' }

const nekoSyndicate = game(48, 'Neko Syndicate')
const carcassonne = game(10, 'Carcassonne')

const group: GroupWithMembersAndGames = {
    id: 1,
    name: 'DuckDevs TestGroup',
    createdBy: 1,
    createdAt: '2026-09-01T10:00:00.000Z',
    members: [
        {
            id: 1,
            username: 'david',
            displayName: 'David',
            avatar: davidAvatar,
            joinedAt: '2026-09-01T10:00:00.000Z',
            games: [carcassonne],
            reviews: [],
        },
        {
            id: 6,
            username: 'bloody',
            displayName: 'Bloody',
            avatar: bloodyAvatar,
            joinedAt: '2026-09-01T10:00:00.000Z',
            games: [nekoSyndicate],
            reviews: [],
        },
    ],
    placeholders: [],
}

const linkedPerson = (id: number, accountId: number, displayName: string, gameIds: Array<number>) => ({
    person: {
        id,
        groupId: 1,
        accountId,
        kind: 'linked' as const,
        status: 'active' as const,
        displayName,
        // Linked people keep their avatar on the account, not on the group person.
        avatar: null,
        createdAt: '2026-09-01T10:00:00.000Z',
    },
    ownership: gameIds.map((gameId) => ({ gameId, status: 'asserted' as const, source: 'account_collection' })),
    preferences: [],
    claimable: false,
})

describe('LogSessionWizardComponent games step', () => {
    let fixture: ComponentFixture<LogSessionWizardComponent>
    let component: LogSessionWizardComponent

    const setup = async (
        people: Array<ReturnType<typeof linkedPerson>> | Observable<{ people: Array<ReturnType<typeof linkedPerson>> }>,
        recording?: SessionRecording,
        params: Record<string, string> = {},
    ) => {
        await TestBed.configureTestingModule({
            imports: [LogSessionWizardComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: { queryParamMap: convertToParamMap(recording ? { sessionId: '99', groupId: '1', ...params } : params) },
                    },
                },
                {
                    provide: DataService,
                    useValue: {
                        userGroups: signal([group]),
                        userGroupsError: signal(false),
                        currentUser: signal({ id: 6 }),
                        refreshUserGroups: vi.fn(),
                        refreshUserHistory: vi.fn(),
                        refreshUserMeets: vi.fn(),
                        userMeets: signal([]),
                    },
                },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({}) } },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
                {
                    provide: Api,
                    useValue: {
                        getGroupPeople: vi.fn().mockReturnValue(isObservable(people) ? people : of({ people })),
                        getGroupPersonCatalog: vi.fn().mockReturnValue(of([])),
                        createPlaySession: vi.fn(),
                        startLiveSession: vi.fn(),
                        correctSession: vi.fn(),
                        getSessionRecording: vi.fn().mockReturnValue(of(recording)),
                        getGameView: vi.fn().mockReturnValue(of({ gameData: nekoSyndicate })),
                    },
                },
            ],
        }).compileComponents()

        fixture = TestBed.createComponent(LogSessionWizardComponent)
        component = fixture.componentInstance
        fixture.detectChanges()
    }

    // Walk the wizard the way a person does: group, day, and attendees, then the games step.
    const reachGamesStepWith = (attendeeNames: Array<string>) => {
        component.selectGroup(group)
        fixture.detectChanges()
        expect(component.currentStep()).toBe('who')

        for (const name of attendeeNames) {
            const attendee = component.attendees().find((candidate) => candidate.user.displayName === name)
            if (!attendee) throw new Error(`No attendee named ${name}`)
            component.toggleAttendee(attendee.user.id)
            fixture.detectChanges()
        }
        expect(component.canProceedToNextStep()).toBe(true)

        component.nextStep()
        fixture.detectChanges()
        expect(component.currentStep()).toBe('games')
    }

    const offeredGames = () => component.games().map((selection) => selection.game.title)

    it('offers the games owned by the selected group people', async () => {
        await setup([linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])])

        reachGamesStepWith(['Bloody'])

        expect(
            component
                .attendees()
                .filter((attendee) => attendee.selected)
                .map((attendee) => attendee.user.displayName),
        ).toEqual(['Bloody'])
        expect(offeredGames()).toEqual(['Neko Syndicate'])
        expect(component.isStepComplete('who')).toBe(true)
    })

    it('does not list someone who left the group, whose group person stays for history', async () => {
        const left = {
            ...linkedPerson(4, 5, 'Gone', [10]),
            person: { ...linkedPerson(4, 5, 'Gone', [10]).person, standing: 'left' as const },
        }
        await setup([linkedPerson(3, 6, 'Bloody', [48]), left])

        component.selectGroup(group)
        fixture.detectChanges()

        expect(component.attendees().map((attendee) => attendee.user.displayName)).not.toContain('Gone')
    })

    it('offers the games owned by the selected members when the group has no group people', async () => {
        await setup([])

        reachGamesStepWith(['David', 'Bloody'])

        expect(offeredGames().sort()).toEqual(['Carcassonne', 'Neko Syndicate'])
    })

    it('keeps members ticked before a slow group-people response arrives', async () => {
        const slowPeople = new Subject<{ people: Array<ReturnType<typeof linkedPerson>> }>()
        await setup(slowPeople)
        component.selectGroup(group)
        fixture.detectChanges()

        // Still showing account members: tick Bloody (account 6) before the people list loads.
        component.toggleAttendee(6)
        fixture.detectChanges()
        slowPeople.next({ people: [linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])] })
        fixture.detectChanges()

        expect(component.usesGroupPeople()).toBe(true)
        expect(
            component
                .attendees()
                .filter((attendee) => attendee.selected)
                .map((attendee) => attendee.user.id),
        ).toEqual([3])
        component.nextStep()
        fixture.detectChanges()
        expect(offeredGames()).toEqual(['Neko Syndicate'])
    })

    it('ignores a late group-people response for a group that is no longer selected', async () => {
        const slowPeople = new Subject<{ people: Array<ReturnType<typeof linkedPerson>> }>()
        await setup(slowPeople)
        component.selectGroup(group)
        fixture.detectChanges()

        // The second group has no group people; its own request answers straight away.
        vi.mocked(TestBed.inject(Api).getGroupPeople).mockReturnValue(of({ people: [] }) as never)
        const otherGroup = { ...group, id: 2, name: 'Other group' }
        component.selectGroup(otherGroup)
        fixture.detectChanges()
        slowPeople.next({ people: [linkedPerson(1, 1, 'David', [10])] })
        fixture.detectChanges()

        expect(component.usesGroupPeople()).toBe(false)
        expect(component.attendees().map((attendee) => attendee.user.displayName)).toEqual(['David', 'Bloody'])
    })

    const reachReviewStep = () => {
        reachGamesStepWith(['Bloody'])
        component.toggleGame(48)
        fixture.detectChanges()
        component.nextStep()
        fixture.detectChanges()
        expect(component.currentStep()).toBe('save')
    }
    const saveButton = () =>
        [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].find((button) =>
            button.textContent?.includes('Save session'),
        ) as HTMLButtonElement

    it('enables Save session on the last step and saves the recorded session', async () => {
        await setup([linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])])
        const api = TestBed.inject(Api)
        vi.mocked(api.createPlaySession).mockReturnValue(of({ sessionId: 99 }) as never)
        const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
        reachReviewStep()

        expect(saveButton().disabled).toBe(false)
        saveButton().click()
        await fixture.whenStable()

        expect(api.createPlaySession).toHaveBeenCalledOnce()
        expect(api.createPlaySession).toHaveBeenCalledWith(
            expect.objectContaining({ groupId: 1, groupPersonIds: [3], games: [{ gameId: 48, participantPersonIds: [3] }] }),
            expect.stringMatching(/^[0-9a-f-]{36}$/),
        )
        expect(navigate).toHaveBeenCalledWith(['/sessions', 99], { queryParams: { saved: 1 } })
        // The cached history (Play › History, Home) must include the new session without a reload.
        const dataService = TestBed.inject(DataService)
        expect(dataService.refreshUserHistory).toHaveBeenCalledOnce()
        expect(dataService.refreshUserMeets).toHaveBeenCalledOnce()
    })

    it('keeps Save session disabled while a game has no players', async () => {
        await setup([linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])])
        reachReviewStep()
        component.toggleMatrixCell(3, 48)
        fixture.detectChanges()

        expect(saveButton().disabled).toBe(true)
    })

    it("shows a linked person's account avatar and username, and initials for a person without an account", async () => {
        const placeholder = {
            ...linkedPerson(9, 0, 'Guest Player', []),
            person: { ...linkedPerson(9, 0, 'Guest Player', []).person, accountId: null, kind: 'placeholder' as const },
        }
        await setup([linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48]), placeholder as never])
        component.selectGroup(group)
        fixture.detectChanges()

        const byName = (name: string) => component.attendees().find((attendee) => attendee.user.displayName === name)?.user
        expect(byName('David')?.avatar).toEqual(davidAvatar)
        expect(byName('David')?.username).toBe('david')
        expect(byName('Bloody')?.avatar).toEqual(bloodyAvatar)
        expect(byName('Bloody')?.username).toBe('bloody')
        expect(byName('Guest Player')?.avatar).toEqual(expect.objectContaining({ type: 'initials', initials: 'GU' }))
    })

    it('keeps the attendee and game choices when going back and forward', async () => {
        await setup([linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])])
        reachGamesStepWith(['Bloody'])
        component.toggleGame(48)
        fixture.detectChanges()

        component.previousStep()
        fixture.detectChanges()
        component.nextStep()
        fixture.detectChanges()

        expect(
            component
                .attendees()
                .filter((attendee) => attendee.selected)
                .map((attendee) => attendee.user.displayName),
        ).toEqual(['Bloody'])
        expect(offeredGames()).toEqual(['Neko Syndicate'])
    })

    it('keeps the chosen games and players when the attendees change', async () => {
        await setup([linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])])
        reachGamesStepWith(['Bloody', 'David'])
        component.toggleGame(48)
        fixture.detectChanges()
        component.toggleMatrixCell(1, 48)
        fixture.detectChanges()

        // David leaves the list and comes back: Neko Syndicate stays chosen, and he still did not play it.
        component.previousStep()
        component.toggleAttendee(1)
        fixture.detectChanges()
        component.toggleAttendee(1)
        fixture.detectChanges()

        expect(component.getSelectedGames().map((selection) => selection.game.id)).toEqual([48])
        expect(component.isMatrixCellSelected(3, 48)).toBe(true)
        expect(component.isMatrixCellSelected(1, 48)).toBe(false)
    })

    it('filters the games by title but keeps the chosen ones in view', async () => {
        await setup([linkedPerson(1, 1, 'David', [10, 48])])
        reachGamesStepWith(['David'])
        component.toggleGame(48)
        component.gameQuery.set('carc')
        fixture.detectChanges()

        expect(component.visibleGames().map((selection) => selection.game.title)).toEqual(['Carcassonne', 'Neko Syndicate'])
        component.gameQuery.set('zzz')
        expect(component.visibleGames().map((selection) => selection.game.title)).toEqual(['Neko Syndicate'])
    })

    it('searches beyond ownership and saves repeated plays with different players and results', async () => {
        await setup([])
        reachGamesStepWith(['David', 'Bloody'])
        const borrowed = game(99, 'Borrowed game')
        vi.mocked(TestBed.inject(Api).getGroupPersonCatalog).mockReturnValue(of([borrowed]))
        component.gameQuery.set('Borrowed')
        await component.searchCatalog()
        fixture.detectChanges()
        // Found beyond ownership, offered apart from the attendees' games until it is added.
        expect(component.otherGames().map((item) => item.id)).toEqual([99])
        expect(component.visibleGames()).toEqual([])
        component.addCatalogGame(borrowed)
        fixture.detectChanges()
        expect(component.getSelectedGames().map((selection) => selection.game.id)).toEqual([99])
        expect(component.otherGames()).toEqual([])
        component.repeatGame(99)
        const extra = component.playsFor(99)[0]
        if (!extra) throw new Error('The second play was not added')
        component.togglePlayPerson(extra.key, 6)
        component.setResult(99, 1, 'isWinner', true, extra.key)
        component.setResult(99, 1, 'score', '12', extra.key)
        expect(component.recordedPlays()).toEqual([
            { gameId: 99, participantIds: [1, 6] },
            { gameId: 99, participantIds: [1], results: [{ accountId: 1, isWinner: true, score: 12 }] },
        ])
        component.togglePlayPerson(extra.key, 1)
        expect(component.hasParticipantsForEveryGame()).toBe(false)
    })

    it('restores mixed legacy accounts and group people with results, despite overlapping same-group loads', async () => {
        const people = new Subject<{ people: Array<ReturnType<typeof linkedPerson>> }>()
        const play = {
            gameId: 48,
            participantIds: [1],
            participantPersonIds: [12],
            results: [
                { accountId: 1, isWinner: true, score: 7 },
                { groupPersonId: 12, isWinner: false, score: 3 },
            ],
        }
        await setup(people, {
            groupId: 1,
            sessionDate: '2026-10-03T12:00:00Z',
            timezone: 'Europe/Madrid',
            attendeeIds: [1],
            groupPersonIds: [12],
            games: [play],
            revision: 8,
        })
        await fixture.whenStable()
        fixture.detectChanges()
        people.next({ people: [linkedPerson(11, 1, 'David', [48]), linkedPerson(12, 6, 'Bloody', [48])] })
        fixture.detectChanges()
        expect(component.getSelectedAttendeeNames()).toContain('David')
        expect(component.getSelectedAttendeeNames()).toContain('Bloody')
        expect(component.recordedPlays()).toEqual([{ ...play, results: expect.arrayContaining(play.results) }])
        expect(component.recordedPlays()[0]?.results).toHaveLength(2)
        expect(component.canProceedToNextStep()).toBe(true)
    })

    it('switches to starting the night live in place, and will not start a second live night in the group', async () => {
        await setup([linkedPerson(1, 1, 'David', [10])])
        component.selectGroup(group)
        fixture.detectChanges()
        const offer = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button')).find(
            (button) => button.textContent?.trim() === 'Start the night live',
        )
        expect(offer).toBeDefined()
        offer?.click()
        fixture.detectChanges()
        expect(component.isLive()).toBe(true)
        expect(component.getStepInfo().label).toBe('Who is here')

        component.toggleAttendee(component.attendees()[0]?.user.id as number)
        expect(component.canProceedToNextStep()).toBe(true)
        const meets = TestBed.inject(DataService).userMeets as unknown as ReturnType<
            typeof signal<Array<{ id: number; groupId: number; status: string }>>
        >
        meets.set([{ id: 5, groupId: group.id, status: 'active' }])
        fixture.detectChanges()
        expect(component.canProceedToNextStep()).toBe(false)
        expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/sessions/5"]')?.textContent).toContain('Open it')
    })

    it('does not silently substitute the only remaining group for an unavailable scoped group', async () => {
        await setup([], undefined, { groupId: '9999' })
        expect(component.selectedGroup()).toBeNull()
        expect(component.canProceedToNextStep()).toBe(false)
        component.selectGroup(group)
        fixture.detectChanges()
        expect(component.selectedGroup()?.id).toBe(group.id)
    })

    it('preserves separate account and linked-person results when both occur in an older recording', async () => {
        const people = new Subject<{ people: Array<ReturnType<typeof linkedPerson>> }>()
        const play = {
            gameId: 48,
            participantIds: [1],
            participantPersonIds: [11],
            results: [
                { accountId: 1, isWinner: true, score: 7 },
                { groupPersonId: 11, isWinner: false, score: 3 },
            ],
        }
        await setup(people, {
            groupId: 1,
            sessionDate: '2026-10-03T12:00:00Z',
            timezone: 'Europe/Madrid',
            attendeeIds: [1],
            groupPersonIds: [11],
            games: [play],
            revision: 8,
        })
        await fixture.whenStable()
        fixture.detectChanges()
        people.next({ people: [linkedPerson(11, 1, 'David', [48])] })
        fixture.detectChanges()
        expect(component.getSelectedAttendeeNames()).toContain('David (separate account entry)')
        expect(component.recordedPlays()).toEqual([{ ...play, results: expect.arrayContaining(play.results) }])
        expect(component.recordedPlays()[0]?.results).toHaveLength(2)
    })

    it('rejects a day in the future', async () => {
        await setup([])
        component.sessionDate.setValue('2999-01-01')

        expect(component.sessionDate.hasError('futureDate')).toBe(true)
    })

    describe('when Board Vault cannot confirm the night was saved (#246)', () => {
        const maybeSaved = () => new ApiUnavailableError({ kind: 'timeout', outcomeUnknown: true, url: '/sessions', status: 0 })
        const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

        it('says so, keeps the choices, and a retry sends the same session with the same key', async () => {
            await setup([linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])])
            const api = TestBed.inject(Api)
            vi.mocked(api.createPlaySession)
                .mockReturnValueOnce(throwError(maybeSaved) as never)
                .mockReturnValueOnce(of({ sessionId: 99 }) as never)
            const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
            reachReviewStep()

            saveButton().click()
            await fixture.whenStable()
            expect(component.recordingError()).toBe(
                'We couldn’t confirm the session was saved. Your choices are still here: try again without changing them and it won’t be saved twice.',
            )
            expect(component.currentStep()).toBe('save')
            // A session that was saved after all shows up in the cached lists.
            expect(TestBed.inject(DataService).refreshUserHistory).toHaveBeenCalledOnce()

            saveButton().click()
            await fixture.whenStable()
            const [first, retry] = vi.mocked(api.createPlaySession).mock.calls
            const [firstBody, firstKey] = first ?? []
            const [retryBody, retryKey] = retry ?? []
            expect(firstKey).toMatch(UUID)
            expect(retryKey).toBe(firstKey)
            expect(retryBody).toEqual(firstBody)
            expect(navigate).toHaveBeenCalledWith(['/sessions', 99], { queryParams: { saved: 1 } })
        })

        it('uses a new key after a failure that certainly saved nothing', async () => {
            await setup([linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])])
            const api = TestBed.inject(Api)
            vi.mocked(api.createPlaySession).mockReturnValue(
                throwError(
                    () => new ApiUnavailableError({ kind: 'server', outcomeUnknown: false, url: '/sessions', status: 500 }),
                ) as never,
            )
            reachReviewStep()

            saveButton().click()
            await fixture.whenStable()
            saveButton().click()
            await fixture.whenStable()

            expect(component.recordingError()).toBe(
                'Could not save the session. Your choices are still here; check your connection and try again.',
            )
            const [first, retry] = vi.mocked(api.createPlaySession).mock.calls
            const [firstKey, retryKey] = [first?.[1], retry?.[1]]
            expect(retryKey).not.toBe(firstKey)
        })

        it('starts a live night once: a retry resends the first start time with the same key', async () => {
            vi.useFakeTimers({ toFake: ['Date'] })
            try {
                vi.setSystemTime(new Date('2026-10-06T19:00:00Z'))
                await setup([linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])], undefined, { mode: 'live' })
                const api = TestBed.inject(Api)
                vi.mocked(api.startLiveSession)
                    .mockReturnValueOnce(throwError(maybeSaved) as never)
                    .mockReturnValueOnce(of({ sessionId: 77, status: 'active' }) as never)
                const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true)
                component.selectGroup(group)
                component.toggleAttendee(3)
                fixture.detectChanges()

                component.nextStep()
                await fixture.whenStable()
                expect(component.recordingError()).toBe(
                    'We couldn’t confirm the night was started. Your choices are still here: try again without changing them and it won’t be started twice.',
                )

                vi.setSystemTime(new Date('2026-10-06T19:02:00Z'))
                component.nextStep()
                await fixture.whenStable()

                const [first, retry] = vi.mocked(api.startLiveSession).mock.calls

                const [firstBody, firstKey] = first ?? []

                const [retryBody, retryKey] = retry ?? []
                expect(firstKey).toMatch(UUID)
                expect(retryKey).toBe(firstKey)
                expect(retryBody).toEqual(firstBody)
                expect(retryBody?.sessionDate).toBe('2026-10-06T19:00:00.000Z')
                expect(navigate).toHaveBeenCalledWith(['/sessions', 77])
            } finally {
                vi.useRealTimers()
            }
        })

        it('corrects a recorded session without a key and without saying it may have been created', async () => {
            const recording: SessionRecording = {
                groupId: 1,
                sessionDate: '2026-10-03T12:00:00Z',
                timezone: 'Europe/Madrid',
                attendeeIds: [],
                groupPersonIds: [3],
                games: [{ gameId: 48, participantIds: [], participantPersonIds: [3], results: [] }],
                revision: 4,
            }
            await setup([linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])], recording)
            const api = TestBed.inject(Api)
            vi.mocked(api.correctSession).mockReturnValue(throwError(maybeSaved) as never)
            await fixture.whenStable()
            fixture.detectChanges()

            component.currentStep.set('save')
            fixture.detectChanges()
            component.nextStep()
            await fixture.whenStable()

            expect(api.createPlaySession).not.toHaveBeenCalled()
            expect(vi.mocked(api.correctSession).mock.calls[0]).toHaveLength(2)
            expect(component.recordingError()).toBe(
                'Could not save the session. Your choices are still here; check your connection and try again.',
            )
        })
    })

    describe('when the group people cannot be loaded', () => {
        type PeopleAnswer = { people: Array<ReturnType<typeof linkedPerson>> }
        const down = () => throwError(() => new Error('Board Vault could not be reached'))
        const page = () => fixture.nativeElement as HTMLElement
        const byTestId = (id: string) => page().querySelector<HTMLElement>(`[data-testid="${id}"]`)
        const nextButton = () =>
            [...page().querySelectorAll('button')].find((button) => button.textContent?.trim() === 'Next') as HTMLButtonElement
        const people = [linkedPerson(1, 1, 'David', [10]), linkedPerson(3, 6, 'Bloody', [48])]

        it('says so instead of showing only the member accounts, and keeps Next locked', async () => {
            await setup(down())
            component.toggleAttendee(6)
            fixture.detectChanges()

            expect(byTestId('people-error')?.getAttribute('role')).toBe('alert')
            expect(byTestId('people-error')?.textContent).toContain('The group’s people couldn’t be loaded')
            expect(byTestId('people-grid')).toBeNull()
            expect(page().textContent).not.toContain('1 of 2')
            expect(component.usesGroupPeople()).toBe(false)
            expect(component.canProceedToNextStep()).toBe(false)
            expect(nextButton().disabled).toBe(true)
        })

        it('treats a catalogue that cannot be loaded the same way, since games only group people own would be missing', async () => {
            await setup(people)
            const api = TestBed.inject(Api)
            vi.mocked(api.getGroupPersonCatalog).mockReturnValue(down() as never)
            component.selectedGroup.set(null)
            fixture.detectChanges()
            component.selectGroup(group)
            fixture.detectChanges()

            expect(api.getGroupPersonCatalog).toHaveBeenCalledTimes(2)
            expect(byTestId('people-error')).not.toBeNull()
            expect(component.usesGroupPeople()).toBe(false)
            expect(component.canProceedToNextStep()).toBe(false)
        })

        it('keeps Next locked while the people are on their way, and says they are loading', async () => {
            const slowPeople = new Subject<PeopleAnswer>()
            await setup(slowPeople)
            component.toggleAttendee(6)
            fixture.detectChanges()

            expect(byTestId('people-loading')?.getAttribute('role')).toBe('status')
            expect(component.canProceedToNextStep()).toBe(false)

            slowPeople.next({ people })
            fixture.detectChanges()
            expect(byTestId('people-loading')).toBeNull()
            expect(byTestId('people-error')).toBeNull()
            expect(component.canProceedToNextStep()).toBe(true)
        })

        it('loads them again on Retry, keeping the message until they arrive, then moves focus to the first person', async () => {
            await setup(down())
            const api = TestBed.inject(Api)
            const retried = new Subject<PeopleAnswer>()
            vi.mocked(api.getGroupPeople).mockReturnValue(retried as never)
            component.toggleAttendee(6)
            fixture.detectChanges()

            byTestId('people-retry')?.click()
            fixture.detectChanges()
            expect(api.getGroupPeople).toHaveBeenCalledTimes(2)
            expect(byTestId('people-error')).not.toBeNull()
            expect(byTestId('people-retry')?.getAttribute('aria-busy')).toBe('true')
            expect(byTestId('people-loading')).not.toBeNull()
            // A second press while it is loading doesn't start another load.
            byTestId('people-retry')?.click()
            expect(api.getGroupPeople).toHaveBeenCalledTimes(2)

            retried.next({ people })
            fixture.detectChanges()
            await fixture.whenStable()

            expect(byTestId('people-error')).toBeNull()
            expect(component.usesGroupPeople()).toBe(true)
            // Bloody was ticked as an account before the error; the choice is kept as their group person.
            expect(component.getSelectedAttendeeNames()).toBe('Bloody')
            expect(component.canProceedToNextStep()).toBe(true)
            expect(document.activeElement).toBe(byTestId('people-grid')?.querySelector('button'))
        })

        it('leaves focus alone when the person moved it while the people were loading again', async () => {
            await setup(down())
            const api = TestBed.inject(Api)
            const retried = new Subject<PeopleAnswer>()
            vi.mocked(api.getGroupPeople).mockReturnValue(retried as never)
            fixture.detectChanges()
            byTestId('people-retry')?.click()
            const elsewhere = page().querySelector<HTMLInputElement>('input[type="date"]') as HTMLInputElement
            elsewhere.focus()

            retried.next({ people })
            fixture.detectChanges()
            await fixture.whenStable()
            expect(document.activeElement).toBe(elsewhere)
        })

        it('shows the message again when Retry fails too', async () => {
            await setup(down())
            const api = TestBed.inject(Api)
            const retried = new Subject<PeopleAnswer>()
            vi.mocked(api.getGroupPeople).mockReturnValue(retried as never)
            fixture.detectChanges()
            byTestId('people-retry')?.click()
            retried.error(new Error('still down'))
            fixture.detectChanges()

            expect(byTestId('people-error')).not.toBeNull()
            expect(byTestId('people-loading')).toBeNull()
            expect(byTestId('people-retry')?.getAttribute('aria-busy')).toBeNull()
            expect(component.canProceedToNextStep()).toBe(false)
        })

        it('ignores a failure for a group that is no longer selected', async () => {
            const slowPeople = new Subject<PeopleAnswer>()
            await setup(slowPeople)
            vi.mocked(TestBed.inject(Api).getGroupPeople).mockReturnValue(of({ people: [] }) as never)
            component.selectGroup({ ...group, id: 2, name: 'Other group' })
            fixture.detectChanges()
            slowPeople.error(new Error('late failure'))
            fixture.detectChanges()

            expect(byTestId('people-error')).toBeNull()
            expect(byTestId('people-grid')).not.toBeNull()
        })

        it('clears the message when another group is chosen', async () => {
            await setup(down())
            vi.mocked(TestBed.inject(Api).getGroupPeople).mockReturnValue(of({ people: [] }) as never)
            component.selectGroup({ ...group, id: 2, name: 'Other group' })
            fixture.detectChanges()

            expect(byTestId('people-error')).toBeNull()
            component.toggleAttendee(6)
            expect(component.canProceedToNextStep()).toBe(true)
        })

        it('still records by member accounts in a group that has no group people', async () => {
            await setup([])
            component.toggleAttendee(6)
            fixture.detectChanges()

            expect(byTestId('people-error')).toBeNull()
            expect(byTestId('people-loading')).toBeNull()
            expect(component.usesGroupPeople()).toBe(false)
            expect(component.canProceedToNextStep()).toBe(true)
        })

        const recordingWithPeople: SessionRecording = {
            groupId: 1,
            sessionDate: '2026-10-03T12:00:00Z',
            timezone: 'Europe/Madrid',
            attendeeIds: [],
            groupPersonIds: [3],
            games: [{ gameId: 48, participantIds: [], participantPersonIds: [3], results: [] }],
            revision: 4,
        }

        it('lets a night with group people be corrected once Retry loads them', async () => {
            await setup(down(), recordingWithPeople)
            await fixture.whenStable()
            fixture.detectChanges()
            expect(byTestId('people-error')).not.toBeNull()
            expect(component.canProceedToNextStep()).toBe(false)

            vi.mocked(TestBed.inject(Api).getGroupPeople).mockReturnValue(of({ people }) as never)
            byTestId('people-retry')?.click()
            fixture.detectChanges()

            expect(byTestId('people-error')).toBeNull()
            expect(component.getSelectedAttendeeNames()).toBe('Bloody')
            expect(component.canProceedToNextStep()).toBe(true)
        })

        it('explains why a night whose group people are all gone cannot be corrected', async () => {
            await setup([], recordingWithPeople)
            await fixture.whenStable()
            fixture.detectChanges()

            expect(byTestId('people-missing')?.getAttribute('role')).toBe('alert')
            expect(byTestId('people-grid')).toBeNull()
            expect(component.canProceedToNextStep()).toBe(false)
        })

        it('takes the message away as soon as another group is chosen, while its people load', async () => {
            await setup(down())
            vi.mocked(TestBed.inject(Api).getGroupPeople).mockReturnValue(new Subject<PeopleAnswer>() as never)
            component.selectGroup({ ...group, id: 2, name: 'Other group' })
            fixture.detectChanges()

            expect(byTestId('people-error')).toBeNull()
            expect(byTestId('people-loading')).not.toBeNull()
        })
    })
})
