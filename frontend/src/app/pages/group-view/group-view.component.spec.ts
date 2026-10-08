import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { BehaviorSubject, type Observable, of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import { DataService } from '../../core/services/data.service'
import { LoadingService } from '../../core/services/loading.service'
import { formatAttendeeSummary } from '../../core/utils/formatAttendeeSummary'
import { GroupViewComponent, shouldShowFirstGroupSetup } from './group-view.component'

describe('GroupViewComponent switching groups', () => {
    const group = (id: number, name: string) => ({ id, name, createdBy: 6, members: [{ id: 6, games: [] }], placeholders: [] })

    const setup = () => {
        const params = new BehaviorSubject(convertToParamMap({ groupId: '1' }))
        const collections: Record<number, Subject<unknown>> = { 1: new Subject(), 4: new Subject() }
        const api = {
            getGroupCollection: vi.fn((groupId: number) => collections[groupId]),
            getGroupInsights: vi.fn(() => of(null)),
            getGroupAcquisitionBoard: vi.fn(() => of([])),
            getGroupPeople: vi.fn(() => of({ people: [] })),
            getGroupPersonCatalog: vi.fn(() => of([])),
            getGroupMeetings: vi.fn(() => of([])),
        }
        const dataService = {
            currentUser: signal({ id: 6 }),
            userGroups: signal([group(1, 'DuckDevs'), group(4, 'Private group')]),
            userGroupsError: signal(false),
            userMeets: signal([]),
            invitationsGroupIndex: signal({}),
            groupHistoryByGroupId: signal<Record<number, Array<never>>>({}),
        }

        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: { paramMap: params.value } } },
                { provide: Api, useValue: api },
                { provide: DataService, useValue: dataService },
            ],
        })
        const component = TestBed.runInInjectionContext(() => new GroupViewComponent())
        TestBed.tick()
        return { component, params, collections, api, dataService }
    }

    it('shows the group the switcher moved to, without a reload', () => {
        const { component, params, api } = setup()
        expect(component.groupData$()?.id).toBe(1)

        params.next(convertToParamMap({ groupId: '4' }))
        TestBed.tick()

        expect(component.groupData$()?.name).toBe('Private group')
        expect(api.getGroupCollection).toHaveBeenLastCalledWith(4)
        expect(api.getGroupMeetings).toHaveBeenLastCalledWith(6, 4)
    })

    it('does not stay loading when it leaves a group whose history was still loading', () => {
        const { component, params, api, dataService } = setup()
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

    it('ignores an answer for the previous group that arrives after switching', () => {
        const { component, params, collections } = setup()

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
    const setup = (collection: Observable<unknown>) => {
        const api = {
            getGroupCollection: vi.fn(() => collection),
            getGroupInsights: vi.fn(() => of(null)),
            getGroupAcquisitionBoard: vi.fn(() => of([])),
            getGroupPeople: vi.fn(() => of({ people: [] })),
            getGroupPersonCatalog: vi.fn(() => of([])),
            getGroupMeetings: vi.fn(() => of([])),
        }
        const dataService = {
            currentUser: signal({ id: 6 }),
            userGroups: signal([{ id: 1, name: 'DuckDevs', createdBy: 6, members: [{ id: 6, games: [] }], placeholders: [] }]),
            userGroupsError: signal(false),
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
                        snapshot: { paramMap: convertToParamMap({ groupId: '1' }) },
                    },
                },
                { provide: Api, useValue: api },
                { provide: DataService, useValue: dataService },
            ],
        })
        const component = TestBed.runInInjectionContext(() => new GroupViewComponent())
        TestBed.tick()
        return { component, api }
    }

    it('shows it is loading, instead of the line for a group without data', () => {
        const pending = new Subject<never>()
        const { component } = setup(pending)

        expect(component.collectionLoading()).toBe(true)
        expect(component.collectionError()).toBe(false)
    })

    it('says when it could not be loaded, and loads it again on retry', () => {
        const { component, api } = setup(throwError(() => new Error('offline')))

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
    it('keeps the newest answer when an older retry fails late', () => {
        const first = new Subject<never>()
        const api = {
            getGroupCollection: vi.fn<(groupId: number) => Observable<unknown>>(() => first),
            getGroupInsights: vi.fn(() => of(null)),
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
                        snapshot: { paramMap: convertToParamMap({ groupId: '1' }) },
                    },
                },
                { provide: Api, useValue: api },
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal({ id: 6 }),
                        userGroups: signal([{ id: 1, name: 'DuckDevs', createdBy: 6, members: [{ id: 6, games: [] }], placeholders: [] }]),
                        userGroupsError: signal(false),
                        userMeets: signal([]),
                        invitationsGroupIndex: signal({}),
                        groupHistoryByGroupId: signal({}),
                    },
                },
            ],
        })
        const component = TestBed.runInInjectionContext(() => new GroupViewComponent())
        TestBed.tick()

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

    const render = async (currentUserId: number) => {
        const params = new BehaviorSubject(convertToParamMap({ groupId: '1' }))
        await TestBed.configureTestingModule({
            imports: [GroupViewComponent],
            providers: [
                provideRouter([]),
                { provide: ActivatedRoute, useValue: { paramMap: params, snapshot: { paramMap: params.value } } },
                {
                    provide: Api,
                    useValue: {
                        getGroupCollection: vi.fn(() => of(null)),
                        getGroupInsights: vi.fn(() => of(null)),
                        getGroupAcquisitionBoard: vi.fn(() => of([])),
                        getGroupPeople: vi.fn(() => of({ people: [] })),
                        getGroupPersonCatalog: vi.fn(() => of([])),
                        getGroupMeetings: vi.fn(() => of([])),
                    },
                },
                {
                    provide: DataService,
                    useValue: {
                        currentUser: signal({ id: currentUserId }),
                        userGroups: signal([group]),
                        userGroupsError: signal(false),
                        userMeets: signal([]),
                        invitationsGroupIndex: signal({}),
                        groupHistoryByGroupId: signal<Record<number, Array<never>>>({ 1: [] }),
                    },
                },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({}) } },
            ],
        }).compileComponents()
        const fixture = TestBed.createComponent(GroupViewComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        fixture.detectChanges()
        return fixture
    }

    it('lays the sections out in the order they read, with no throwaway member picker', async () => {
        const fixture = await render(7)
        const element = fixture.nativeElement as HTMLElement
        const ids = [...element.querySelectorAll('section[id]')].map((section) => section.id)

        expect(ids).toEqual(['overview', 'history', 'library', 'acquire', 'people'])
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
})
