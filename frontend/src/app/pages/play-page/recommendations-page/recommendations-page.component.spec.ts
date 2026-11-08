import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { type Observable, of, Subject, throwError } from 'rxjs'
import { Api } from '../../../api/api'
import { ToastService } from '../../../components/toast/toast.service'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { RecommendationsPageComponent } from './recommendations-page.component'

describe('RecommendationsPageComponent history context', () => {
    it('makes the selected group the decision context', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent

        expect(component.getDecisionTitle({ name: 'Friday Crew' })).toBe('What should Friday Crew play?')
        expect(component.getDecisionTitle(null)).toBe('Decide what to play')
    })

    it('labels persisted group play history honestly', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent

        expect(component.getRecommendationHistoryLabel('2026-08-16T19:30:00.000Z')).toBe('Last played by this group')
        expect(component.getRecommendationHistoryLabel(null)).toBe('Not played by this group yet')
    })

    it('uses plain-language labels for the decision lens shown with results', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent

        expect(component.getDecisionLensLabel('balanced')).toBe('Balanced')
        expect(component.getDecisionLensLabel('fresh')).toBe('Something new')
        expect(component.getDecisionLensLabel('favorite')).toBe('Group favorite')
    })

    it('selects everyone who can come, leaving out people who left the group or were archived', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent
        const selectedAttendeeIds = signal<Array<number>>([])
        const person = (id: number, extra: object = {}) => ({ person: { id, status: 'active', ...extra } })

        Object.assign(component, {
            selectedAttendeeIds,
            recommendations: signal(null),
            recommendationSignals: signal(null),
            feedbackState: signal({}),
            errorMessage: signal(null),
            decisionLens: signal('balanced'),
            selectedGroup: signal({ members: [{ id: 1 }] }),
            groupPeople: signal([
                person(11),
                person(12, { standing: 'left' }),
                person(13, { status: 'archived' }),
                person(14, { standing: 'member' }),
            ]),
        })

        component.selectAllAttendees()

        expect(selectedAttendeeIds()).toEqual([11, 14])
    })

    it('keeps suggestions while people change and clears them when nobody is coming', () => {
        const component = Object.create(RecommendationsPageComponent.prototype) as RecommendationsPageComponent
        const selectedAttendeeIds = signal([2])
        const recommendations = signal({ recommendations: [] } as never)
        const recommendationSignals = signal({ signals: [] } as never)
        const feedbackState = signal({ 42: 'interested' } as never)
        const errorMessage = signal('stale error')
        const decisionLens = signal<'balanced' | 'fresh' | 'favorite'>('balanced')
        const group = { members: [{ id: 1 }, { id: 2 }, { id: 3 }] }

        Object.assign(component, {
            selectedAttendeeIds,
            recommendations,
            recommendationSignals,
            feedbackState,
            errorMessage,
            decisionLens,
            selectedGroup: signal(group),
        })

        // Changing the people keeps the current suggestions on screen until the new ones arrive.
        component.selectAllAttendees()
        expect(selectedAttendeeIds()).toEqual([1, 2, 3])
        expect(recommendations()).not.toBeNull()
        expect(errorMessage()).toBeNull()

        component.setDecisionLens('fresh')
        expect(decisionLens()).toBe('fresh')
        expect(component.decisionLensLabel).toBe('Something new')

        // With nobody coming there is nothing to suggest.
        component.clearAttendees()
        expect(selectedAttendeeIds()).toEqual([])
        expect(recommendations()).toBeNull()
        expect(recommendationSignals()).toBeNull()
        expect(feedbackState()).toEqual({})
    })
})

describe('RecommendationsPageComponent and the next game night', () => {
    const night = (overrides: Record<string, unknown>) => ({
        id: 21,
        groupId: 7,
        createdBy: 9,
        meetDate: '2099-10-09T17:00:00.000Z',
        isConfirmed: false,
        status: 'scheduled',
        timezone: 'Europe/Madrid',
        notes: null,
        myRsvpStatus: 'pending',
        gamesToBring: [],
        ...overrides,
    })

    const setup = (meets: Array<ReturnType<typeof night>>) => {
        const proposeSessionGame = vi.fn().mockReturnValue(of({ sessionId: 21, plannedGameIds: [42], gameVotes: [] }))
        const toast = { success: vi.fn(), error: vi.fn() }
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: Api, useValue: { proposeSessionGame } },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({}) } } },
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal({ id: 1 }),
                        userGroups: signal([{ id: 7, name: 'Fridays', createdBy: 9, members: [] }]),
                        userGroupsError: signal(false),
                        userMeets: signal(meets),
                    },
                },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({}) } },
                { provide: ToastService, useValue: toast },
            ],
        })
        const component = TestBed.createComponent(RecommendationsPageComponent).componentInstance
        component.selectedGroupId.set(7)
        return { component, proposeSessionGame, toast }
    }

    it('offers the earliest planned night you are coming to, and adds the game to it', async () => {
        const { component, proposeSessionGame } = setup([
            night({ id: 22, meetDate: '2099-10-16T17:00:00.000Z' }),
            night({ id: 21 }),
            night({ id: 20, meetDate: '2099-10-02T17:00:00.000Z', myRsvpStatus: 'declined' }),
            night({ id: 19, meetDate: '2099-10-01T17:00:00.000Z', status: 'cancelled' }),
        ])

        expect(component.nextNight()?.id).toBe(21)
        expect(component.nextNightLabel()).toBe('Fri 9 Oct')

        await component.addToNextNight(42)
        expect(proposeSessionGame).toHaveBeenCalledWith(21, 42)
        expect(component.addedToNight()[42]).toBe(true)
    })

    it('has no night to offer when you are not coming to any', () => {
        const { component } = setup([night({ myRsvpStatus: 'declined' }), night({ id: 30, myRsvpStatus: null })])

        expect(component.nextNight()).toBeNull()
    })
})

describe('RecommendationsPageComponent when the group people cannot be loaded', () => {
    type PeopleAnswer = { people: Array<unknown> }
    const down = () => throwError(() => new Error('Board Vault could not be reached'))
    const member = (id: number, name: string) => ({ id, username: name.toLowerCase(), displayName: name, avatar: null, games: [] })
    const fridays = { id: 7, name: 'Fridays', createdBy: 1, members: [member(1, 'Organizer'), member(2, 'Member')] }
    const sundays = { id: 8, name: 'Sundays', createdBy: 1, members: [member(1, 'Organizer')] }
    const person = (id: number, accountId: number | null, displayName: string) => ({
        person: { id, accountId, displayName, status: 'active', avatar: null },
        ownership: [],
        preferences: [],
        claimable: false,
    })
    const people = [person(11, 1, 'Organizer'), person(13, null, 'Guest')]

    const setup = (answer: Observable<PeopleAnswer>, groups: Array<typeof fridays> = [fridays], query: Record<string, string> = {}) => {
        const api = {
            getGroupPeople: vi.fn().mockReturnValue(answer),
            getParticipantRecommendations: vi.fn().mockReturnValue(of({ recommendations: [], noResultReason: 'Nothing fits' })),
            getRecommendations: vi.fn().mockReturnValue(of({ recommendations: [], noResultReason: 'Nothing fits' })),
            getParticipantRecommendationSignals: vi.fn().mockReturnValue(of(null)),
            getRecommendationSignals: vi.fn().mockReturnValue(of(null)),
        }
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal({ id: 1 }),
                        userGroups: signal(groups),
                        userGroupsError: signal(false),
                        userMeets: signal([]),
                    },
                },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({}) } },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        })
        const fixture = TestBed.createComponent(RecommendationsPageComponent)
        fixture.detectChanges()
        const page = () => fixture.nativeElement as HTMLElement
        const byTestId = (id: string) => page().querySelector<HTMLElement>(`[data-testid="${id}"]`)
        return { fixture, component: fixture.componentInstance, api, page, byTestId }
    }
    // Suggestions reload a moment after the choices settle.
    const afterReloadDelay = () => new Promise((resolve) => setTimeout(resolve, 600))

    it('says so and asks for no suggestions, instead of suggesting for the member accounts alone', async () => {
        const { fixture, component, api, page, byTestId } = setup(down())
        await afterReloadDelay()
        fixture.detectChanges()

        expect(byTestId('people-error')?.getAttribute('role')).toBe('alert')
        expect(byTestId('people-error')?.textContent).toContain('The group’s people couldn’t be loaded')
        expect(byTestId('people-chips')).toBeNull()
        expect(byTestId('suggestions-wait')).not.toBeNull()
        expect(page().textContent).not.toContain('Choose who is coming to see what fits')
        expect(component.selectedAttendeeIds()).toEqual([])
        expect(api.getRecommendations).not.toHaveBeenCalled()
        expect(api.getParticipantRecommendations).not.toHaveBeenCalled()

        await component.loadRecommendations()
        expect(api.getRecommendations).not.toHaveBeenCalled()
    })

    it('loads them again on Retry with the people the link asked for, then suggests for them and moves focus to the first person', async () => {
        const { fixture, component, api, byTestId } = setup(down(), [fridays], { participantIds: '13' })
        const retried = new Subject<PeopleAnswer>()
        api.getGroupPeople.mockReturnValue(retried)
        fixture.detectChanges()

        byTestId('people-retry')?.click()
        fixture.detectChanges()
        expect(api.getGroupPeople).toHaveBeenCalledTimes(2)
        expect(byTestId('people-error')).not.toBeNull()
        expect(byTestId('people-retry')?.getAttribute('aria-busy')).toBe('true')
        expect(byTestId('people-loading')).not.toBeNull()
        byTestId('people-retry')?.click()
        expect(api.getGroupPeople).toHaveBeenCalledTimes(2)

        retried.next({ people })
        retried.complete()
        fixture.detectChanges()
        await fixture.whenStable()

        expect(byTestId('people-error')).toBeNull()
        expect(component.selectedAttendeeIds()).toEqual([13])
        expect(document.activeElement).toBe(byTestId('people-chips')?.querySelector('button'))
        await afterReloadDelay()
        expect(api.getParticipantRecommendations).toHaveBeenCalledWith(expect.objectContaining({ groupId: 7, groupPersonIds: [13] }))
    })

    it('shows the message again when Retry fails too', async () => {
        const { fixture, component, api, byTestId } = setup(down())
        api.getGroupPeople.mockReturnValue(down())
        fixture.detectChanges()
        byTestId('people-retry')?.click()
        fixture.detectChanges()

        expect(byTestId('people-error')).not.toBeNull()
        expect(byTestId('people-loading')).toBeNull()
        expect(component.groupPeopleLoading()).toBe(false)
    })

    it('ignores a slow answer for a group that is no longer chosen', async () => {
        const slow = new Subject<PeopleAnswer>()
        const { fixture, component, api, byTestId } = setup(slow, [fridays, sundays])
        api.getGroupPeople.mockReturnValue(of({ people: [person(21, 1, 'Organizer')] }))
        component.selectGroup(8)
        fixture.detectChanges()
        slow.error(new Error('late failure'))
        fixture.detectChanges()

        expect(byTestId('people-error')).toBeNull()
        expect(component.selectedAttendeeIds()).toEqual([21])

        // A late success for the first group doesn't replace the second group's people either.
        const slowAgain = new Subject<PeopleAnswer>()
        api.getGroupPeople.mockReturnValue(slowAgain)
        component.selectGroup(7)
        api.getGroupPeople.mockReturnValue(of({ people: [person(21, 1, 'Organizer')] }))
        component.selectGroup(8)
        slowAgain.next({ people })
        expect(component.selectedAttendeeIds()).toEqual([21])
    })

    it('clears the message when another group is chosen', async () => {
        const { fixture, component, api, byTestId } = setup(down(), [fridays, sundays])
        api.getGroupPeople.mockReturnValue(of({ people: [person(21, 1, 'Organizer')] }))
        component.selectGroup(8)
        fixture.detectChanges()

        expect(byTestId('people-error')).toBeNull()
        expect(byTestId('people-chips')).not.toBeNull()
    })

    it('suggests for the member accounts in a group that has no group people', async () => {
        const { fixture, component, api, byTestId } = setup(of({ people: [] }))
        fixture.detectChanges()

        expect(byTestId('people-error')).toBeNull()
        expect(component.selectedAttendeeIds()).toEqual([1, 2])
        await afterReloadDelay()
        expect(api.getRecommendations).toHaveBeenCalledWith(expect.objectContaining({ groupId: 7, attendeeIds: [1, 2] }))
    })

    it('takes the message away as soon as another group is chosen, while its people load', async () => {
        const { fixture, component, api, byTestId } = setup(down(), [fridays, sundays])
        api.getGroupPeople.mockReturnValue(new Subject<PeopleAnswer>())
        component.selectGroup(8)
        fixture.detectChanges()

        expect(byTestId('people-error')).toBeNull()
        expect(byTestId('people-loading')).not.toBeNull()
    })

    it('asks nothing of a person who presses for suggestions while the people are missing', async () => {
        const { fixture, component, page } = setup(down())
        await component.loadRecommendations()
        fixture.detectChanges()

        expect(component.errorMessage()).toBeNull()
        expect(page().textContent).not.toContain('Select a group and at least one attendee')
    })

    it('keeps the accounts a link asked for when Retry loads the people', async () => {
        const { fixture, component, api, byTestId } = setup(down(), [fridays], { attendeeIds: '1' })
        api.getGroupPeople.mockReturnValue(of({ people }))
        fixture.detectChanges()
        byTestId('people-retry')?.click()
        fixture.detectChanges()

        // Account 1 is the organizer, group person 11.
        expect(component.selectedAttendeeIds()).toEqual([11])
    })

    it('suggests by member account when none of the group people can take part, never sending account ids as people', async () => {
        const archived = { ...person(11, 1, 'Organizer'), person: { ...person(11, 1, 'Organizer').person, status: 'archived' } }
        const { api } = setup(of({ people: [archived] }))
        await afterReloadDelay()

        expect(api.getRecommendations).toHaveBeenCalledWith(expect.objectContaining({ groupId: 7, attendeeIds: [1, 2] }))
        expect(api.getParticipantRecommendations).not.toHaveBeenCalled()
    })

    it('does not keep loading for a group that is no longer listed', async () => {
        const { component, api } = setup(of({ people }))
        api.getGroupPeople.mockClear()
        component.selectGroup(99)

        expect(api.getGroupPeople).not.toHaveBeenCalled()
        expect(component.groupPeopleLoading()).toBe(false)
    })
})
