import { signal } from '@angular/core'
import { ComponentFixture, TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router'
import { isObservable, type Observable, of, Subject } from 'rxjs'
import { Api } from '../../api/api'
import type { GameCompleteType, GroupWithMembersAndGames, SessionRecording } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
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
        expect(component.visibleGames().map((selection) => selection.game.id)).toEqual([99])
        component.toggleGame(99)
        fixture.detectChanges()
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

    it('does not silently substitute the only remaining group for an unavailable scoped group', async () => {
        await setup([], undefined, { groupId: '9999' })
        expect(component.selectedGroup()).toBeNull()
        expect(component.canProceedToNextStep()).toBe(false)
        component.selectGroup(group)
        fixture.detectChanges()
        expect(component.selectedGroup()?.id).toBe(group.id)
    })

    it('rejects a day in the future', async () => {
        await setup([])
        component.sessionDate.setValue('2999-01-01')

        expect(component.sessionDate.hasError('futureDate')).toBe(true)
    })
})
