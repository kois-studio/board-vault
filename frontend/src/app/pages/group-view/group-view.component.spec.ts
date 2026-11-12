import { HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { BehaviorSubject, type Observable, of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { ResourceStatus } from '../../core/async/resource-state'
import { withStates } from '../../core/async/resource-state.testing'
import { DataService } from '../../core/services/data.service'
import { ApiUnavailableError } from '../../core/utils/apiUnavailable'
import { formatAttendeeSummary } from '../../core/utils/formatAttendeeSummary'
import { GroupViewComponent, shouldShowFirstGroupSetup } from './group-view.component'

/** The group shows once its shelf is read (#262): let that answer arrive. */
async function shelfRead(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve))
    TestBed.tick()
}

describe('GroupViewComponent switching groups', () => {
    const group = (id: number, name: string) => ({ id, name, createdBy: 6, members: [{ id: 6, games: [] }], placeholders: [] })

    const setup = async () => {
        const params = new BehaviorSubject(convertToParamMap({ groupId: '1' }))
        const collections: Record<number, Subject<unknown>> = { 1: new Subject(), 4: new Subject() }
        const api = {
            getGroupCollection: vi.fn((groupId: number) => collections[groupId]),
            getGroupInsights: vi.fn(() => of(null)),
            getGroupActivity: vi.fn(() => of({ entries: [], hasMore: false })),
            getGroupAcquisitionBoard: vi.fn(() => of([])),
            getGroupPeople: vi.fn(() => of({ people: [] })),
            getGroupPersonCatalog: vi.fn(() => of([])),
            getGroupMeetings: vi.fn(() => of([])),
            updateGroupPersonOwnership: vi.fn(() => of({})),
        }
        const dataService = {
            currentUser: signal({ id: 6 }),
            refreshUserGroups: vi.fn(),
            userGroups: signal([group(1, 'DuckDevs'), group(4, 'Private group')]),
            userMeets: signal([]),
            invitationsGroupIndex: signal({}),
            groupHistoryByGroupId: signal<Record<number, Array<never>>>({}),
        }

        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: params, fragment: of(null), snapshot: { paramMap: params.value } } },
                { provide: Api, useValue: api },
                { provide: DataService, useValue: withStates(dataService) },
            ],
        })
        const component = TestBed.runInInjectionContext(() => new GroupViewComponent())
        await shelfRead()
        return { component, params, collections, api, dataService }
    }

    it('shows the night that comes next, not one that is waiting for results', async () => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date('2026-10-15T12:00:00Z'))
        try {
            const { component, dataService } = await setup()
            const meet = (id: number, groupId: number, meetDate: string, status = 'scheduled') => ({
                id,
                groupId,
                meetDate,
                status,
                timezone: 'UTC',
            })
            ;(dataService.userMeets as ReturnType<typeof signal<Array<unknown>>>).set([
                meet(1, 1, '2026-10-08T18:00:00Z'), // a week ago, nobody recorded it: waiting for results
                meet(2, 1, '2026-10-18T17:00:00Z'),
                meet(3, 1, '2026-10-15T18:00:00Z'),
                meet(4, 4, '2026-10-16T18:00:00Z'), // another group
                meet(5, 1, '2026-10-01T18:00:00Z', 'completed'),
            ])

            expect(component.upcomingMeetingsComputed().map((next) => next.id)).toEqual([3, 2])
            expect(component.nextMeetingComputed()?.id).toBe(3)

            // A night waiting for results is not the next one, but the group is under way: no first-group setup.
            ;(dataService.userMeets as ReturnType<typeof signal<Array<unknown>>>).set([meet(1, 1, '2026-10-08T18:00:00Z')])
            expect(component.nextMeetingComputed()).toBeNull()
            expect(component.hasOpenSessionComputed()).toBe(true)
            ;(dataService.userMeets as ReturnType<typeof signal<Array<unknown>>>).set([meet(5, 1, '2026-10-01T18:00:00Z', 'completed')])
            expect(component.hasOpenSessionComputed()).toBe(false)
            ;(dataService.userMeets as ReturnType<typeof signal<Array<unknown>>>).set([
                meet(1, 1, '2026-10-08T18:00:00Z'),
                meet(2, 1, '2026-10-18T17:00:00Z'),
                meet(3, 1, '2026-10-15T18:00:00Z'),
                meet(4, 4, '2026-10-16T18:00:00Z'),
                meet(5, 1, '2026-10-01T18:00:00Z', 'completed'),
            ])

            // A night running now goes first, whatever its date.
            ;(dataService.userMeets as ReturnType<typeof signal<Array<unknown>>>).update((meets) => [
                ...meets,
                meet(6, 1, '2026-10-14T18:00:00Z', 'active'),
            ])
            expect(component.nextMeetingComputed()?.id).toBe(6)
        } finally {
            vi.useRealTimers()
        }
    })

    it('reloads the groups after a placeholder game changes, so the library shows it', async () => {
        const { component, api, dataService } = await setup()
        const person = { person: { id: 9 } } as Parameters<typeof component.setGroupPersonOwnership>[0]

        await component.setGroupPersonOwnership(person, 42, { target: { value: 'asserted' } } as unknown as Event)

        expect(api.updateGroupPersonOwnership).toHaveBeenCalledWith(1, 9, 42, 'asserted')
        expect(dataService.refreshUserGroups).toHaveBeenCalled()
    })

    it('shows the group the switcher moved to, without a reload', async () => {
        const { component, params, api } = await setup()
        expect(component.groupData$()?.id).toBe(1)

        params.next(convertToParamMap({ groupId: '4' }))
        await shelfRead()

        expect(component.groupData$()?.name).toBe('Private group')
        expect(api.getGroupCollection).toHaveBeenLastCalledWith(4)
        expect(api.getGroupMeetings).toHaveBeenLastCalledWith(6, 4)
    })

    it('does not stay loading when it leaves a group whose history was still loading', async () => {
        const { component, params, api, dataService } = await setup()
        const pending = new Subject<never>()
        api.getGroupMeetings.mockReturnValueOnce(pending)

        component.retryGroupHistory()
        expect(component.isLoading()).toBe(true)

        // Group 4's history is already known, so nothing new loads for it.
        dataService.groupHistoryByGroupId.set({ 4: [] })
        params.next(convertToParamMap({ groupId: '4' }))
        TestBed.tick()
        pending.complete()

        expect(component.isLoading()).toBe(false)
    })

    it('ignores an answer for the previous group that arrives after switching', async () => {
        const { component, params, collections } = await setup()

        params.next(convertToParamMap({ groupId: '4' }))
        TestBed.tick()
        collections[1]?.next({ totalWorth: 567, people: [] })
        expect(component.collection$()).toBeNull()

        collections[4]?.next({ totalWorth: 334, people: [] })
        expect(component.collection$()).toEqual({ totalWorth: 334, people: [] })
    })
})

describe('formatAttendeeSummary', () => {
    it('uses an honest fallback when no attendance was recorded', () => {
        expect(formatAttendeeSummary([])).toBe('Attendance not recorded')
    })

    it('keeps a short attendee list readable and summarizes longer lists', () => {
        const attendees = [
            { displayName: 'Ana', username: 'ana' },
            { displayName: '', username: 'bo' },
            { displayName: 'Cris', username: 'cris' },
            { displayName: 'Dani', username: 'dani' },
        ]

        expect(formatAttendeeSummary(attendees.slice(0, 2))).toBe('With Ana, bo')
        expect(formatAttendeeSummary(attendees)).toBe('With Ana, bo, Cris + 1 more')
    })
})

describe('shouldShowFirstGroupSetup', () => {
    const emptyGroup = {
        memberCount: 1,
        gameCount: 0,
        historyCount: 0,
        hasUpcomingSession: false,
        historyLoading: false,
        historyError: false,
    }

    it('shows the invite, add-games, and first-session handoff for a new empty group', () => {
        expect(shouldShowFirstGroupSetup(emptyGroup)).toBe(true)
    })

    it('does not show onboarding while history is unresolved or after the group has activity', () => {
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, historyLoading: true })).toBe(false)
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, memberCount: 2 })).toBe(false)
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, gameCount: 1 })).toBe(false)
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, hasUpcomingSession: true })).toBe(false)
        expect(shouldShowFirstGroupSetup({ ...emptyGroup, sessionsUnknown: true })).toBe(false)
    })
})

describe('group participant history presentation', () => {
    it('includes placeholder attendees and players in the same summaries as account members', () => {
        const component = Object.create(GroupViewComponent.prototype) as GroupViewComponent
        const ana = { id: 9, displayName: 'Ana', avatar: null, accountId: null }
        expect(component.getAttendeeSummary([{ id: 4, displayName: 'Carlos', username: 'carlos' } as never], [ana])).toBe(
            'With Ana, Carlos',
        )
    })

    it('lists a member once when a session records both their account and their group person', () => {
        const component = Object.create(GroupViewComponent.prototype) as GroupViewComponent
        const carlosAccount = { id: 4, displayName: 'Carlos', username: 'carlos' } as never
        const carlosPerson = { id: 2, displayName: 'Carlos G.', avatar: null, accountId: 4 }

        expect(component.getAttendeeSummary([carlosAccount], [carlosPerson])).toBe('With Carlos G.')
        expect(
            component.getPlayerCount({
                gameData: {} as never,
                playedBy: [carlosAccount],
                playedByPeople: [carlosPerson],
                winnerAccountIds: [],
                winnerPersonIds: [],
            }),
        ).toBe(1)
    })

    it('names the winners of a played game', () => {
        const component = Object.create(GroupViewComponent.prototype) as GroupViewComponent
        const ana = { id: 9, displayName: 'Ana', avatar: null, accountId: null }
        const carlos = { id: 2, displayName: 'Carlos', avatar: null, accountId: 4 }

        expect(
            component.getWinners({
                gameData: {} as never,
                playedBy: [],
                playedByPeople: [ana, carlos],
                winnerAccountIds: [4],
                winnerPersonIds: [9],
            }),
        ).toBe('Ana and Carlos won')
        expect(component.getWinners({ gameData: {} as never, playedBy: [], playedByPeople: [ana] })).toBe('')
    })
})

describe('group standings presentation', () => {
    it('summarises wins, games and nights with singular forms', () => {
        const component = Object.create(GroupViewComponent.prototype) as GroupViewComponent
        const standing = { accountId: 1, groupPersonId: 4, displayName: 'Ana', avatar: null, sessions: 1, gamesPlayed: 3, wins: 1 }

        expect(component.standingSummary(standing)).toBe('1 win · 3 games · 1 night')
        expect(component.standingSummary({ ...standing, wins: 0, gamesPlayed: 1, sessions: 2 })).toBe('0 wins · 1 game · 2 nights')
    })
})

describe('GroupViewComponent collection worth', () => {
    const setup = async (collection: Observable<unknown>) => {
        const api = {
            getGroupCollection: vi.fn(() => collection),
            getGroupInsights: vi.fn(() => of(null)),
            getGroupActivity: vi.fn(() => of({ entries: [], hasMore: false })),
            getGroupAcquisitionBoard: vi.fn(() => of([])),
            getGroupPeople: vi.fn(() => of({ people: [] })),
            getGroupPersonCatalog: vi.fn(() => of([])),
            getGroupMeetings: vi.fn(() => of([])),
        }
        const dataService = {
            currentUser: signal({ id: 6 }),
            userGroups: signal([{ id: 1, name: 'DuckDevs', createdBy: 6, members: [{ id: 6, games: [] }], placeholders: [] }]),
            userMeets: signal([]),
            invitationsGroupIndex: signal({}),
            groupHistoryByGroupId: signal({}),
        }
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({ groupId: '1' })),
                        fragment: of(null),
                        snapshot: { paramMap: convertToParamMap({ groupId: '1' }) },
                    },
                },
                { provide: Api, useValue: api },
                { provide: DataService, useValue: withStates(dataService) },
            ],
        })
        const component = TestBed.runInInjectionContext(() => new GroupViewComponent())
        await shelfRead()
        return { component, api }
    }

    it('shows it is loading, instead of the line for a group without data', async () => {
        const pending = new Subject<never>()
        const { component } = await setup(pending)

        expect(component.collectionLoading()).toBe(true)
        expect(component.collectionError()).toBe(false)
    })

    it('says when it could not be loaded, and loads it again on retry', async () => {
        const { component, api } = await setup(throwError(() => new Error('offline')))

        expect(component.collectionLoading()).toBe(false)
        expect(component.collectionError()).toBe(true)
        expect(component.collection$()).toBeNull()

        api.getGroupCollection.mockReturnValue(of({ worth: 567, copies: 29, pricedCopies: 20, people: [] }))
        component.retryCollection()

        expect(api.getGroupCollection).toHaveBeenLastCalledWith(1)
        expect(component.collectionError()).toBe(false)
        expect(component.collection$()?.worth).toBe(567)
    })
})

describe('GroupViewComponent collection worth retries', () => {
    it('keeps the newest answer when an older retry fails late', async () => {
        const first = new Subject<never>()
        const api = {
            getGroupCollection: vi.fn<(groupId: number) => Observable<unknown>>(() => first),
            getGroupInsights: vi.fn(() => of(null)),
            getGroupActivity: vi.fn(() => of({ entries: [], hasMore: false })),
            getGroupAcquisitionBoard: vi.fn(() => of([])),
            getGroupPeople: vi.fn(() => of({ people: [] })),
            getGroupPersonCatalog: vi.fn(() => of([])),
            getGroupMeetings: vi.fn(() => of([])),
        }
        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({ groupId: '1' })),
                        fragment: of(null),
                        snapshot: { paramMap: convertToParamMap({ groupId: '1' }) },
                    },
                },
                { provide: Api, useValue: api },
                {
                    provide: DataService,
                    useValue: withStates({
                        currentUser: signal({ id: 6 }),
                        userGroups: signal([{ id: 1, name: 'DuckDevs', createdBy: 6, members: [{ id: 6, games: [] }], placeholders: [] }]),
                        userMeets: signal([]),
                        invitationsGroupIndex: signal({}),
                        groupHistoryByGroupId: signal({}),
                    }),
                },
            ],
        })
        const component = TestBed.runInInjectionContext(() => new GroupViewComponent())
        await shelfRead()

        api.getGroupCollection.mockReturnValue(of({ worth: 567, copies: 29, pricedCopies: 20, people: [] }))
        component.retryCollection()
        first.error(new Error('slow and failed'))

        expect(component.collection$()?.worth).toBe(567)
        expect(component.collectionError()).toBe(false)
        expect(component.collectionLoading()).toBe(false)
    })
})

describe('GroupViewComponent page layout', () => {
    const game = (id: number, minPlayers: number, maxPlayers: number) => ({
        id,
        title: `Game ${id}`,
        titleTranslations: { en: `Game ${id}`, es: `Game ${id}` },
        minPlayers,
        maxPlayers,
        gameAvgDuration: 45,
        imageUrl: null,
    })
    const group = {
        id: 1,
        name: 'DuckDevs',
        createdBy: 6,
        members: [
            { id: 6, username: 'owner', displayName: 'Owner', avatar: null, games: [game(42, 2, 4)], reviews: [] },
            { id: 7, username: 'member', displayName: 'Member', avatar: null, games: [game(43, 5, 8), game(42, 2, 4)], reviews: [] },
        ],
        placeholders: [],
    }

    /** A group with nothing to rank yet, as the API answers it. */
    const noInsights = {
        sessions: 0,
        gamesPlayed: 0,
        gamesWithWinner: 0,
        standings: [],
        mostPlayed: [],
        neverPlayed: [],
        neverPlayedCount: 0,
    }

    const render = async (currentUserId: number, groupData: unknown = group, fragment: string | null = null) => {
        const params = new BehaviorSubject(convertToParamMap({ groupId: '1' }))
        await TestBed.configureTestingModule({
            imports: [GroupViewComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: params, fragment: of(fragment), snapshot: { paramMap: params.value } } },
                {
                    provide: Api,
                    useValue: {
                        getGroupCollection: vi.fn(() => of(null)),
                        getGroupInsights: vi.fn(() => of(noInsights)),
                        getGroupActivity: vi.fn(() => of({ entries: [], hasMore: false })),
                        getGroupAcquisitionBoard: vi.fn(() => of([])),
                        getGroupPeople: vi.fn(() => of({ people: [] })),
                        getGroupPersonCatalog: vi.fn(() => of([])),
                        getGroupMeetings: vi.fn(() => of([])),
                    },
                },
                {
                    provide: DataService,
                    useValue: withStates({
                        currentUser: signal({ id: currentUserId }),
                        userGroups: signal([groupData]),
                        userMeets: signal([]),
                        invitationsGroupIndex: signal({}),
                        groupHistoryByGroupId: signal<Record<number, Array<never>>>({ 1: [] }),
                    }),
                },
            ],
        }).compileComponents()
        const fixture = TestBed.createComponent(GroupViewComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()
        return fixture
    }

    it('opens on the section named in the address, as the Library shortcut on Home asks', async () => {
        const scrolled: Array<string> = []
        const original = Element.prototype.scrollIntoView
        Element.prototype.scrollIntoView = function (this: Element) {
            scrolled.push(this.id)
        }
        try {
            const fixture = await render(7, group, 'library')
            fixture.detectChanges()
            await fixture.whenStable()

            expect(scrolled).toEqual(['library'])
        } finally {
            Element.prototype.scrollIntoView = original
        }
    })

    it("lets a member who is not the owner change a group person's games (ADR-0020)", async () => {
        const fixture = await render(7)
        const component = fixture.componentInstance
        const api = TestBed.inject(Api) as unknown as Record<string, ReturnType<typeof vi.fn>>
        api['updateGroupPersonOwnership'] = vi.fn(() => of({ success: true }))
        const person = { person: { id: 3 }, ownership: [], preferences: [] } as never
        const event = { target: { value: 'rejected' } } as unknown as Event

        await component.setGroupPersonOwnership(person, 42, event)

        expect(api['updateGroupPersonOwnership']).toHaveBeenCalledWith(1, 3, 42, 'rejected')
    })

    describe("for a member who is not one of the group's people yet (#278)", () => {
        const placeholder = (id: number, suggested: boolean) => ({
            person: { id, displayName: `Person ${id}`, kind: 'placeholder', status: 'active', accountId: null },
            ownership: [],
            preferences: [],
            claimable: true,
            suggested,
        })

        it('asks them to find themselves among the people without an account, or say they are new', async () => {
            const fixture = await render(7)
            fixture.componentInstance.groupPeople$.set([placeholder(3, false), placeholder(4, false)] as never)
            fixture.detectChanges()
            const banner = (fixture.nativeElement as HTMLElement).querySelector('[data-testid="choose-person-banner"]')

            expect(banner?.textContent).toContain('Are you already one of this group’s people?')
            expect(banner?.querySelector('a')?.getAttribute('href')).toBe('/groups/1/people/choose')
            expect(banner?.textContent).toContain('I’m new here')
        })

        it('goes straight to the person an invitation suggested', async () => {
            const fixture = await render(7)
            fixture.componentInstance.groupPeople$.set([placeholder(3, false), placeholder(4, true)] as never)
            fixture.detectChanges()
            const element = fixture.nativeElement as HTMLElement

            expect(element.querySelector('[data-testid="choose-person-banner"]')).toBeNull()
            expect(element.textContent).toContain('A group person is waiting for you')
            expect(element.querySelector('a[href="/groups/1/people/4/claim"]')).not.toBeNull()
        })
    })

    describe("when a change to a person's games is not saved (#242)", () => {
        const person = {
            person: { id: 3, displayName: 'Sam', kind: 'placeholder', status: 'active' },
            ownership: [{ gameId: 42, status: 'asserted', source: null }],
            preferences: [{ gameId: 42, preference: 'like' }],
            claimable: false,
            suggested: false,
        }

        const openEditor = async (fail: unknown) => {
            const fixture = await render(7)
            const component = fixture.componentInstance
            const api = TestBed.inject(Api) as unknown as Record<string, ReturnType<typeof vi.fn>>
            const refused = vi.fn(() => throwError(() => fail))
            api['updateGroupPersonOwnership'] = refused
            api['updateGroupPersonPreference'] = refused
            api['deleteGroupPersonPreference'] = refused
            api['getGroupPeople'] = vi.fn(() => of({ people: [person] }))
            component.groupPeople$.set([person] as never)
            component.toggleGroupPersonEditor(3)
            fixture.detectChanges()
            const element = fixture.nativeElement as HTMLElement
            const row = () =>
                [...element.querySelectorAll('li:has(select)')].find((item) => item.textContent?.includes('Game 42')) as HTMLLIElement
            const [ownership, preference] = [...row().querySelectorAll('select')] as Array<HTMLSelectElement>
            const pick = async (select: HTMLSelectElement | undefined, value: string) => {
                if (!select) throw new Error('no menu')
                select.value = value
                select.dispatchEvent(new Event('change'))
                await fixture.whenStable()
                fixture.detectChanges()
            }
            return { fixture, component, api, row, ownership, preference, pick }
        }

        it('puts the ownership menu back to what is stored and says so under the row', async () => {
            const { row, ownership, pick } = await openEditor(new HttpErrorResponse({ status: 503 }))

            await pick(ownership, 'rejected')

            expect(ownership?.value).toBe('asserted')
            const message = row().querySelector('[data-testid="group-person-save-error"]')
            expect(message?.getAttribute('role')).toBe('alert')
            expect(message?.textContent).toContain('That change wasn’t saved. Try again.')
        })

        it('ties the message to the menus and gives focus back to the menu used, which saving had locked', async () => {
            const { fixture, row, ownership, preference, pick } = await openEditor(new HttpErrorResponse({ status: 503 }))
            const element = fixture.nativeElement as HTMLElement
            document.body.append(element)
            try {
                await pick(ownership, 'rejected')
                await fixture.whenStable()

                const message = row().querySelector('[data-testid="group-person-save-error"]')
                expect(message?.id).toBe('group-person-save-error-3-42')
                expect(ownership?.getAttribute('aria-describedby')).toBe('group-person-save-error-3-42')
                expect(preference?.getAttribute('aria-describedby')).toBe('group-person-save-error-3-42')
                expect(document.activeElement).toBe(ownership)
            } finally {
                element.remove()
            }
        })

        it('puts the preference menu back too, including clearing it', async () => {
            const { row, preference, pick } = await openEditor(new HttpErrorResponse({ status: 503 }))

            await pick(preference, 'avoid')
            expect(preference?.value).toBe('like')

            await pick(preference, '')
            expect(preference?.value).toBe('like')
            expect(row().querySelector('[data-testid="group-person-save-error"]')).not.toBeNull()
        })

        it('reads the people again when Board Vault did not answer in time, since it may be saved', async () => {
            const { row, ownership, api, pick } = await openEditor(
                new ApiUnavailableError({ kind: 'timeout', outcomeUnknown: true, url: '/groups/1/people/3' }),
            )
            api['getGroupPeople']?.mockClear()

            await pick(ownership, 'rejected')

            expect(api['getGroupPeople']).toHaveBeenCalledTimes(1)
            expect(row().querySelector('[data-testid="group-person-save-error"]')?.textContent).toContain(
                'We couldn’t confirm that change was saved.',
            )
        })

        it('keeps the open editor, its menu and focus on screen while it reads the people again', async () => {
            const { fixture, ownership, api, pick } = await openEditor(
                new ApiUnavailableError({ kind: 'timeout', outcomeUnknown: true, url: '/groups/1/people/3' }),
            )
            const people = new Subject<{ people: unknown[] }>()
            api['getGroupPeople'] = vi.fn(() => people)
            const element = fixture.nativeElement as HTMLElement
            document.body.append(element)
            try {
                await pick(ownership, 'rejected')
                await fixture.whenStable()

                expect(element.textContent).not.toContain('Loading group people…')
                expect(ownership?.isConnected).toBe(true)
                expect(document.activeElement).toBe(ownership)
            } finally {
                element.remove()
            }
        })

        it('no longer shows the message once the editor is closed and opened again', async () => {
            const { fixture, component, row, ownership, pick } = await openEditor(new HttpErrorResponse({ status: 503 }))
            await pick(ownership, 'rejected')

            component.toggleGroupPersonEditor(3)
            component.toggleGroupPersonEditor(3)
            fixture.detectChanges()

            expect(row().querySelector('[data-testid="group-person-save-error"]')).toBeNull()
        })
    })

    it('lays the sections out in the order they read, with no throwaway member picker', async () => {
        const fixture = await render(7)
        const element = fixture.nativeElement as HTMLElement
        const ids = [...element.querySelectorAll('section[id]')].map((section) => section.id)

        expect(ids).toEqual(['overview', 'history', 'library', 'acquire', 'people', 'changes'])
        expect(element.textContent).not.toContain('Who is playing?')
        // Tab order follows what is shown: nothing is moved around with CSS order.
        expect([...element.querySelectorAll('[class]')].some((node) => [...node.classList].some((name) => /^order-/.test(name)))).toBe(
            false,
        )
    })

    it('gives members a plan button up top and the way out at the bottom', async () => {
        const fixture = await render(7)
        const buttons = [...(fixture.nativeElement as HTMLElement).querySelectorAll('button')].map((button) => button.textContent?.trim())

        expect(buttons).toContain('Plan a game night')
        expect(buttons).not.toContain('Leave group')
        expect(buttons).toContain('Leave this group')
    })

    it('filters the library by number of players, and back', async () => {
        const fixture = await render(6)
        const component = fixture.componentInstance

        expect(component.totalUniqueGamesComputed().map((entry) => [entry.id, entry.quantity])).toEqual([
            [42, 2],
            [43, 1],
        ])
        component.setPlayerCount(6)
        expect(component.totalUniqueGamesComputed().map((entry) => entry.id)).toEqual([43])
        component.setPlayerCount(6)
        expect(component.totalUniqueGamesComputed()).toHaveLength(2)
    })

    it('shows the group rating of a game out of 5 stars, as ratings are stored out of 10', async () => {
        const fixture = await render(6, {
            ...group,
            members: [
                { ...group.members[0], reviews: [{ gameId: 42, review: 10 }] },
                { ...group.members[1], reviews: [{ gameId: 42, review: 7 }] },
            ],
        })
        const text = (fixture.nativeElement as HTMLElement).textContent

        expect(text).toContain('★ 4.3')
        expect(text).toContain('Group rating 4.3 out of 5')
        expect(text).not.toContain('8.5')
    })

    it('lists the games of people without an account, with their names', async () => {
        const fixture = await render(6, {
            ...group,
            placeholders: [{ id: 9, displayName: 'Mirian', avatar: null, gameIds: [42, 44], games: [game(42, 2, 4), game(44, 2, 6)] }],
        })
        const component = fixture.componentInstance

        expect(component.totalUniqueGamesComputed().map((entry) => [entry.id, entry.quantity])).toEqual([
            [42, 3],
            [43, 1],
            [44, 1],
        ])
        expect(component.groupLibraryContextComputed()[42]?.ownerNames).toEqual(['Owner', 'Member', 'Mirian'])
        fixture.detectChanges()
        expect((fixture.nativeElement as HTMLElement).textContent).toContain('Owned by Mirian')
    })

    it('says how many game nights and games the standings come from, in one sentence', async () => {
        const fixture = await render(7)
        const insights = { gamesWithWinner: 0, standings: [], mostPlayed: [], neverPlayed: [], neverPlayedCount: 0 }
        const summary = () => (fixture.nativeElement as HTMLElement).querySelector('#insights p')?.textContent?.replace(/\s+/g, ' ').trim()

        fixture.componentInstance.insights$.set({ ...insights, sessions: 1, gamesPlayed: 1 })
        fixture.detectChanges()
        expect(summary()).toBe('From 1 finished game night and 1 game played.')

        fixture.componentInstance.insights$.set({ ...insights, sessions: 3, gamesPlayed: 7 })
        fixture.detectChanges()
        expect(summary()).toBe('From 3 finished game nights and 7 games played.')
    })
})

describe('GroupViewComponent while its parts load (#260)', () => {
    const group = {
        id: 1,
        name: 'DuckDevs',
        createdBy: 6,
        members: [{ id: 6, username: 'owner', displayName: 'Owner', avatar: null, games: [], reviews: [] }],
        placeholders: [],
    }
    const noInsights = {
        sessions: 0,
        gamesPlayed: 0,
        gamesWithWinner: 0,
        standings: [],
        mostPlayed: [],
        neverPlayed: [],
        neverPlayedCount: 0,
    }
    /** Past the 150 ms in which `<app-async>` shows nothing, so a skeleton is on screen. */
    const pastSkeletonDelay = () => new Promise((resolve) => setTimeout(resolve, 200))

    const render = async (
        options: {
            groups?: ResourceStatus
            meets?: ResourceStatus
            history?: Observable<unknown>
            insights?: Observable<unknown>
            people?: Observable<unknown>
            userId?: number
        } = {},
    ) => {
        const groupsStatus = signal<ResourceStatus>(options.groups ?? 'ready')
        const meetsStatus = signal<ResourceStatus>(options.meets ?? 'ready')
        const refreshUserMeets = vi.fn()
        await TestBed.configureTestingModule({
            imports: [GroupViewComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        paramMap: of(convertToParamMap({ groupId: '1' })),
                        fragment: of(null),
                        snapshot: { paramMap: convertToParamMap({ groupId: '1' }) },
                    },
                },
                {
                    provide: Api,
                    useValue: {
                        getGroupCollection: vi.fn(() => of({ worth: 0, copies: 0, pricedCopies: 0, people: [] })),
                        getGroupInsights: vi.fn(() => options.insights ?? of(noInsights)),
                        getGroupActivity: vi.fn(() => of({ entries: [], hasMore: false })),
                        getGroupAcquisitionBoard: vi.fn(() => of([])),
                        getGroupPeople: vi.fn(() => options.people ?? of({ people: [] })),
                        getGroupPersonCatalog: vi.fn(() => of([])),
                        getGroupMeetings: vi.fn(() => options.history ?? of([])),
                    },
                },
                {
                    provide: DataService,
                    useValue: withStates(
                        {
                            currentUser: signal({ id: options.userId ?? 6 }),
                            userGroups: signal([group]),
                            userMeets: signal([]),
                            refreshUserMeets,
                            invitationsGroupIndex: signal({}),
                            groupHistoryByGroupId: signal({}),
                        },
                        { userGroups: groupsStatus, userMeets: meetsStatus },
                    ),
                },
            ],
        }).compileComponents()
        const fixture = TestBed.createComponent(GroupViewComponent)
        fixture.autoDetectChanges()
        await fixture.whenStable()
        const element = fixture.nativeElement as HTMLElement
        const text = () => element.textContent ?? ''
        const testId = (id: string) => element.querySelector(`[data-testid="${id}"]`)
        const settle = async () => {
            await new Promise((resolve) => setTimeout(resolve))
            await fixture.whenStable()
        }
        return { element, text, testId, settle, refreshUserMeets, groupsStatus, meetsStatus }
    }

    it('shows the page in outline while your groups first load, and keeps the page while they refresh', async () => {
        const { text, testId, settle, groupsStatus } = await render({ groups: 'loading' })

        expect(testId('group-page-skeleton')).not.toBeNull()
        expect(text()).toContain('Loading your group…')
        expect(text()).not.toContain('Group pulse')

        groupsStatus.set('ready')
        await settle()
        expect(testId('group-page-skeleton')).toBeNull()

        groupsStatus.set('refreshing')
        await settle()
        expect(testId('group-page-skeleton')).toBeNull()
        expect(text()).toContain('Group pulse')
    })

    it('counts no game nights and says the history starts here only once they have loaded', async () => {
        const history = new Subject<Array<never>>()
        const { text, testId, settle } = await render({ history })
        await pastSkeletonDelay()

        expect(testId('sessions-count-placeholder')).not.toBeNull()
        expect(testId('recent-sessions-skeleton')).not.toBeNull()
        expect(text()).not.toContain('Your group history starts here')

        history.next([])
        history.complete()
        // The skeleton stays its 300 ms, so it never blinks.
        await new Promise((resolve) => setTimeout(resolve, 350))
        await settle()

        expect(testId('sessions-count-placeholder')).toBeNull()
        expect(testId('recent-sessions-skeleton')).toBeNull()
        expect(text()).toContain('Your group history starts here')
    })

    it('never counts game nights that could not be loaded as none', async () => {
        const { element, text } = await render({ history: throwError(() => new Error('Board Vault could not be reached')) })

        expect(text()).toContain('Recent sessions could not be loaded.')
        expect(text()).not.toContain('Your group history starts here')
        const sessions = [...element.querySelectorAll('dt')].find((label) => label.textContent?.trim() === 'Sessions')
        expect(sessions?.nextElementSibling?.textContent).toContain('Unavailable')
        expect(sessions?.nextElementSibling?.textContent).not.toContain('0')
    })

    it('says nothing is planned only once your game nights have loaded, and says so when they could not be', async () => {
        const { element, text, settle, meetsStatus, refreshUserMeets } = await render({ meets: 'loading' })
        expect(text()).not.toContain('Nothing planned yet')
        // A new group whose game nights are unknown may have one planned: no first steps yet.
        expect(text()).not.toContain('First steps for this group')

        meetsStatus.set('error')
        await settle()
        expect(text()).not.toContain('Nothing planned yet')
        expect(text()).toContain('Your game nights could not be loaded, so the next one is unknown.')
        expect(text()).not.toContain('First steps for this group')

        const retry = [...element.querySelectorAll('#overview button')].find((button) => button.textContent?.trim() === 'Retry')
        ;(retry as HTMLButtonElement).click()
        expect(refreshUserMeets).toHaveBeenCalledTimes(1)

        meetsStatus.set('ready')
        await settle()
        expect(text()).toContain('Nothing planned yet')
        expect(text()).toContain('First steps for this group')
    })

    it('holds the place of the standings while they load, and leaves no gap for a group with nothing to rank', async () => {
        const insights = new Subject<typeof noInsights>()
        const { element, testId, settle } = await render({ insights })
        await pastSkeletonDelay()

        expect(testId('standings-skeleton')).not.toBeNull()
        const standingsLink = () => [...element.querySelectorAll('nav a')].find((link) => link.textContent?.trim() === 'Standings')
        expect(standingsLink()).toBeDefined()

        insights.next(noInsights)
        insights.complete()
        await new Promise((resolve) => setTimeout(resolve, 350))
        await settle()

        expect(testId('standings-skeleton')).toBeNull()
        expect(element.querySelector('app-async.hidden')).not.toBeNull()
        expect(standingsLink()).toBeUndefined()
    })

    it('asks a member to add themselves only once the people have loaded, never while they load or after they failed', async () => {
        const people = new Subject<{ people: Array<never> }>()
        const { text, settle } = await render({ people, userId: 7 })
        expect(text()).toContain('Loading group people…')
        expect(text()).not.toContain('Add me')

        people.next({ people: [] })
        people.complete()
        await settle()
        expect(text()).toContain('Add me')
    })

    it('does not ask a member to add themselves when the people could not be loaded', async () => {
        const { text } = await render({ people: throwError(() => new Error('Board Vault could not be reached')), userId: 7 })

        expect(text()).toContain('Group people could not be loaded.')
        expect(text()).not.toContain('Add me')
    })
})
