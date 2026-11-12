import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { type Observable, of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { GroupPersonWorkspaceType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { withStates } from '../../core/async/resource-state.testing'
import { DataService } from '../../core/services/data.service'
import { ApiUnavailableError } from '../../core/utils/apiUnavailable'
import { defaultSessionDay, MeetNewComponent } from './meet-new.component'

describe('defaultSessionDay', () => {
    it('is today while 19:00 is ahead, and tomorrow from 19:00 on', () => {
        expect(defaultSessionDay(new Date(2026, 9, 6, 18, 59))).toBe('2026-10-06')
        expect(defaultSessionDay(new Date(2026, 9, 6, 19, 0))).toBe('2026-10-07')
        expect(defaultSessionDay(new Date(2026, 9, 31, 22, 0))).toBe('2026-11-01')
    })
})

describe('MeetNewComponent social handoff', () => {
    // The form defaults to today at 19:00; a morning clock keeps that start in the future whenever the tests run.
    beforeEach(() => {
        vi.useFakeTimers({ toFake: ['Date'] })
        vi.setSystemTime(new Date(2026, 9, 6, 10, 0))
    })
    afterEach(() => vi.useRealTimers())

    const organizer = {
        id: 1,
        displayName: 'Organizer',
        username: 'organizer',
        avatar: null,
        games: [{ id: 42, title: 'Cascadia', titleTranslations: { en: 'Cascadia', es: 'Cascadia' }, minPlayers: 1, maxPlayers: 4 }],
    }
    const member = { id: 2, displayName: 'Member', username: 'member', avatar: null, games: [] as typeof organizer.games }
    const group = { id: 7, name: 'Friday Crew', createdBy: 1, members: [organizer, member] }

    const setup = async (
        queryParams: Record<string, string> = {},
        groupData = group,
        people: Array<GroupPersonWorkspaceType> | Observable<{ people: Array<GroupPersonWorkspaceType> }> = [],
        catalog: Observable<Array<unknown>> = of([]),
    ) => {
        const api = {
            scheduleSession: vi
                .fn()
                .mockName('scheduleSession')
                .mockReturnValue(of({ id: 99 })),
            getGroupPeople: vi
                .fn()
                .mockName('getGroupPeople')
                .mockReturnValue(Array.isArray(people) ? of({ people }) : people),
            getGroupPersonCatalog: vi.fn().mockName('getGroupPersonCatalog').mockReturnValue(catalog),
        }
        const routerData = {
            snapshot: {
                paramMap: convertToParamMap({ groupId: '7' }),
                queryParamMap: convertToParamMap(queryParams),
            },
        }
        const dataService = {
            currentUser: signal({ id: 1 }),
            userGroups: signal([groupData]),
            invitationsGroupIndex: signal({}),
            refreshUserMeets: vi.fn().mockName('refreshUserMeets'),
        }

        await TestBed.configureTestingModule({
            imports: [MeetNewComponent],
            providers: [
                provideRouter([]),
                { provide: Api, useValue: api },
                { provide: ActivatedRoute, useValue: routerData },
                { provide: DataService, useValue: withStates(dataService) },
                { provide: ToastService, useValue: { success: vi.fn().mockName('success'), error: vi.fn().mockName('error') } },
            ],
        }).compileComponents()

        const fixture = TestBed.createComponent(MeetNewComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        return { fixture, component: fixture.componentInstance, api, dataService }
    }

    it('starts with the way back to the group, above the heading', async () => {
        const { fixture } = await setup()

        const back = fixture.nativeElement.querySelector('a[appBackLink]') as HTMLAnchorElement
        const heading = fixture.nativeElement.querySelector('h1') as HTMLHeadingElement
        expect(back.getAttribute('href')).toBe('/groups/7')
        expect(back.textContent?.trim()).toBe('Back to the group')
        expect(back.compareDocumentPosition(heading) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    })

    it('invites everyone by default and keeps a long name on one line', async () => {
        const longName = '⸻'.repeat(20)
        const { fixture, component } = await setup({}, { ...group, members: [organizer, { ...member, displayName: longName }] })
        fixture.detectChanges()

        expect(component.selectedAttendeeIds()).toEqual([1, 2])
        const tile = [...fixture.nativeElement.querySelectorAll('button[aria-pressed]')].find((element: HTMLElement) =>
            element.textContent?.includes(longName),
        ) as HTMLButtonElement
        const name = tile.querySelector('span.truncate') as HTMLSpanElement
        expect(tile.getAttribute('aria-pressed')).toBe('true')
        expect(name.textContent).toBe(longName)
        expect(name.parentElement?.classList).toContain('min-w-0')
    })

    it('restores selected attendees and the recommended game from the decision handoff', async () => {
        const { component } = await setup({ attendeeIds: '2', plannedGameId: '42' })

        expect(component.groupData()?.id).toBe(7)
        expect(component.selectedAttendeeIds()).toEqual([2])
        expect(component.selectedPlannedGameIds()).toEqual([42])
        expect(component.availableGames().map((game) => game.id)).toEqual([42])
    })

    it('lists who brings each game and whether the player count fits', async () => {
        const { component } = await setup()

        expect(component.shortlistGames()).toEqual([expect.objectContaining({ title: 'Cascadia', owners: ['Organizer'], fits: true })])
        component.toggleAttendee(1)
        expect(component.shortlistGames()[0]?.owners).toEqual([])
    })

    it('invites group people once they load, and sends them as group people', async () => {
        const people = [
            {
                person: { id: 12, accountId: 1, displayName: 'Organizer', status: 'active', avatar: null },
                ownership: [],
                preferences: [],
                claimable: false,
                suggested: false,
            },
            {
                person: { id: 13, accountId: null, displayName: 'Guest', status: 'active', avatar: null },
                ownership: [{ gameId: 42, status: 'asserted' }],
                preferences: [],
                claimable: false,
                suggested: false,
            },
            {
                person: { id: 14, accountId: null, displayName: 'Gone', status: 'archived', avatar: null },
                ownership: [],
                preferences: [],
                claimable: false,
                suggested: false,
            },
            // Left the group: still an active group person, so their history stays, but not invitable.
            {
                person: { id: 15, accountId: 3, displayName: 'Left', status: 'active', standing: 'left', avatar: null },
                ownership: [],
                preferences: [],
                claimable: false,
                suggested: false,
            },
        ] as unknown as Array<GroupPersonWorkspaceType>
        const { fixture, component, api } = await setup({}, group, people)

        expect(component.useGroupPeople()).toBe(true)
        expect(component.people().map((person) => person.name)).toEqual(['Organizer', 'Guest'])
        expect(component.selectedAttendeeIds()).toEqual([12, 13])
        expect(component.shortlistGames()[0]?.owners).toEqual(['Organizer', 'Guest'])

        await component.onClickCreateMeeting()
        await fixture.whenStable()

        expect(api.scheduleSession).toHaveBeenCalledWith(expect.objectContaining({ groupPersonIds: [12, 13] }), expect.any(String))
    })

    it('plans the night only after at least one person is invited', async () => {
        const { component, api, dataService } = await setup()
        component.clearAttendees()

        expect(component.canCreate()).toBe(false)
        component.selectAllAttendees()
        expect(component.canCreate()).toBe(true)

        component.notes.set('Try the group recommendation.')
        await component.onClickCreateMeeting()

        expect(api.scheduleSession).toHaveBeenCalledWith(
            expect.objectContaining({
                groupId: 7,
                attendeeIds: [1, 2],
                plannedGameIds: [],
                notes: 'Try the group recommendation.',
                timezone: expect.any(String),
            }),
            expect.stringMatching(/^[0-9a-f-]{36}$/),
        )
        expect(dataService.refreshUserMeets).toHaveBeenCalled()
        expect(component.isCreating()).toBe(false)
    })

    describe('when Board Vault cannot confirm the night was planned (#246)', () => {
        const maybeSaved = () => new ApiUnavailableError({ kind: 'timeout', outcomeUnknown: true, url: '/sessions/scheduled', status: 0 })
        const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

        it('says so, and a retry sends the same night with the same key so it is planned once', async () => {
            const { component, api, dataService } = await setup()
            const toast = TestBed.inject(ToastService)
            api.scheduleSession.mockReturnValueOnce(throwError(maybeSaved))

            await component.onClickCreateMeeting()
            expect(toast.error).toHaveBeenCalledWith(
                'We couldn’t confirm the game night was planned. Try again without changing anything and it won’t be planned twice.',
            )
            // A night that was saved after all shows up.
            expect(dataService.refreshUserMeets).toHaveBeenCalled()

            await component.onClickCreateMeeting()
            const [first, retry] = api.scheduleSession.mock.calls
            const [firstBody, firstKey] = first ?? []
            const [retryBody, retryKey] = retry ?? []
            expect(firstKey).toMatch(UUID)
            expect(retryKey).toBe(firstKey)
            expect(retryBody).toEqual(firstBody)
            expect(toast.success).toHaveBeenCalledWith('Game night planned.')
        })

        it('uses a new key once the night changed, and after it was planned', async () => {
            const { component, api } = await setup()
            api.scheduleSession.mockReturnValueOnce(throwError(maybeSaved))

            await component.onClickCreateMeeting()
            component.notes.set('Bring snacks.')
            await component.onClickCreateMeeting()
            await component.onClickCreateMeeting()

            const keys = api.scheduleSession.mock.calls.map(([, key]) => key)
            expect(new Set(keys).size).toBe(3)
        })

        it('uses a new key after a failure that certainly saved nothing, and says it failed', async () => {
            const { component, api } = await setup()
            const toast = TestBed.inject(ToastService)
            api.scheduleSession.mockReturnValueOnce(
                throwError(
                    () => new ApiUnavailableError({ kind: 'server', outcomeUnknown: false, url: '/sessions/scheduled', status: 503 }),
                ),
            )

            await component.onClickCreateMeeting()
            await component.onClickCreateMeeting()

            expect(toast.error).toHaveBeenCalledWith('Could not plan the game night. Please try again.')
            const [first, retry] = api.scheduleSession.mock.calls
            const [firstKey, retryKey] = [first?.[1], retry?.[1]]
            expect(retryKey).not.toBe(firstKey)
        })
    })

    it('rejects a day in the past', async () => {
        const { component } = await setup()

        component.pickDate('2000-01-01')

        expect(component.dateForm.hasError('futureDate')).toBe(true)
        expect(component.canCreate()).toBe(false)
    })

    it('rejects a start earlier today, and explains how to plan or record it', async () => {
        vi.setSystemTime(new Date(2026, 9, 6, 20, 15))
        const { fixture, component } = await setup()

        // After 19:00 the form opens on tomorrow; choosing today at 19:00 is already over at 20:15.
        expect(component.dateForm.value).toBe('2026-10-07')
        expect(component.startsInThePast()).toBe(false)
        component.dateForm.setValue(component.today)
        expect(component.startsInThePast()).toBe(true)
        expect(component.canCreate()).toBe(false)
        fixture.detectChanges()
        const timeInput = fixture.nativeElement.querySelector('#session-time') as HTMLInputElement
        expect(timeInput.getAttribute('aria-invalid')).toBe('true')
        expect(fixture.nativeElement.querySelector('#session-date-error').textContent).toContain('That time has already passed today')

        // The current minute still counts, and any later time is fine.
        component.timeForm.setValue('20:15')
        expect(component.canCreate()).toBe(true)
        component.timeForm.setValue('21:00')
        expect(component.startsInThePast()).toBe(false)
        expect(component.canCreate()).toBe(true)
        fixture.detectChanges()
        expect(fixture.nativeElement.querySelector('#session-date-error').textContent.trim()).toBe('')
    })

    it('keeps the same evening open on a later day', async () => {
        vi.setSystemTime(new Date(2026, 9, 6, 20, 15))
        const { component } = await setup()

        component.pickDate('2026-10-07')

        expect(component.startsInThePast()).toBe(false)
        expect(component.canCreate()).toBe(true)
    })

    it('checks the time again when planning, in case it passed while the page was open', async () => {
        vi.setSystemTime(new Date(2026, 9, 6, 18, 50))
        const { component, api } = await setup()
        expect(component.canCreate()).toBe(true)

        vi.setSystemTime(new Date(2026, 9, 6, 19, 5))
        await component.onClickCreateMeeting()

        expect(api.scheduleSession).not.toHaveBeenCalled()
        expect(component.startsInThePast()).toBe(true)
    })

    it('clears stale planning context when the group disappears during a refresh', async () => {
        const { fixture, component, dataService } = await setup()

        expect(component.groupData()?.id).toBe(7)
        dataService.userGroups.set([])
        fixture.detectChanges()

        expect(component.groupData()).toBeNull()
        expect(component.selectedAttendeeIds()).toEqual([])
        expect(component.selectedPlannedGameIds()).toEqual([])
        expect(component.groupUnavailable()).toBe(true)
    })
    describe('when the group people cannot be loaded', () => {
        type PeopleAnswer = { people: Array<GroupPersonWorkspaceType> }
        const down = () => throwError(() => new Error('Board Vault could not be reached'))
        const guest = {
            person: { id: 13, accountId: null, displayName: 'Guest', status: 'active', avatar: null },
            ownership: [{ gameId: 42, status: 'asserted' }],
            preferences: [],
            claimable: false,
            suggested: false,
        } as unknown as GroupPersonWorkspaceType
        const organizerPerson = {
            person: { id: 12, accountId: 1, displayName: 'Organizer', status: 'active', avatar: null },
            ownership: [],
            preferences: [],
            claimable: false,
            suggested: false,
        } as unknown as GroupPersonWorkspaceType
        const page = (fixture: { nativeElement: unknown }) => fixture.nativeElement as HTMLElement
        const byTestId = (fixture: { nativeElement: unknown }, id: string) =>
            page(fixture).querySelector<HTMLElement>(`[data-testid="${id}"]`)
        const planButton = (fixture: { nativeElement: unknown }) =>
            [...page(fixture).querySelectorAll('button')].find((button) =>
                button.textContent?.includes('Plan game night'),
            ) as HTMLButtonElement

        it('says so instead of inviting only the member accounts, and keeps Plan game night locked', async () => {
            const { fixture, component, api } = await setup({}, group, down())
            fixture.detectChanges()

            expect(byTestId(fixture, 'people-error')?.getAttribute('role')).toBe('alert')
            expect(byTestId(fixture, 'people-error')?.textContent).toContain('The group’s people couldn’t be loaded')
            expect(byTestId(fixture, 'people-grid')).toBeNull()
            expect(page(fixture).textContent).not.toContain('2 of 2')
            expect(component.canCreate()).toBe(false)
            expect(planButton(fixture).disabled).toBe(true)

            await component.onClickCreateMeeting()
            expect(api.scheduleSession).not.toHaveBeenCalled()
        })

        it('treats a catalogue that cannot be loaded the same way, and applies nothing half-loaded', async () => {
            const { fixture, component } = await setup({}, group, [organizerPerson, guest], down())
            fixture.detectChanges()

            expect(byTestId(fixture, 'people-error')).not.toBeNull()
            expect(component.useGroupPeople()).toBe(false)
            expect(component.canCreate()).toBe(false)
        })

        it('keeps Plan game night locked while the people are on their way, without showing a list that will change', async () => {
            const slowPeople = new Subject<PeopleAnswer>()
            const { fixture, component } = await setup({}, group, slowPeople)
            fixture.detectChanges()

            expect(byTestId(fixture, 'people-loading')?.getAttribute('role')).toBe('status')
            expect(byTestId(fixture, 'people-grid')).toBeNull()
            // #261: the people in their tiles, one per person the group already lists.
            expect(byTestId(fixture, 'people-grid-skeleton')?.querySelectorAll('.rounded-lg')).toHaveLength(component.expectedPeople())
            expect(component.canCreate()).toBe(false)

            slowPeople.next({ people: [organizerPerson, guest] })
            slowPeople.complete()
            await fixture.whenStable()
            fixture.detectChanges()

            expect(byTestId(fixture, 'people-loading')).toBeNull()
            expect(component.selectedAttendeeIds()).toEqual([12, 13])
            expect(component.canCreate()).toBe(true)
        })

        it('loads them again on Retry, keeping the message and the requested people, then moves focus to the first person', async () => {
            const { fixture, component, api } = await setup({ participantIds: '13' }, group, down())
            const retried = new Subject<PeopleAnswer>()
            api.getGroupPeople.mockReturnValue(retried)
            fixture.detectChanges()

            byTestId(fixture, 'people-retry')?.click()
            fixture.detectChanges()
            expect(api.getGroupPeople).toHaveBeenCalledTimes(2)
            expect(byTestId(fixture, 'people-error')).not.toBeNull()
            expect(byTestId(fixture, 'people-retry')?.getAttribute('aria-busy')).toBe('true')
            expect(byTestId(fixture, 'people-loading')).not.toBeNull()
            byTestId(fixture, 'people-retry')?.click()
            expect(api.getGroupPeople).toHaveBeenCalledTimes(2)

            retried.next({ people: [organizerPerson, guest] })
            retried.complete()
            await fixture.whenStable()
            fixture.detectChanges()
            await fixture.whenStable()

            expect(byTestId(fixture, 'people-error')).toBeNull()
            expect(component.useGroupPeople()).toBe(true)
            // The recommendation asked for the guest only; that choice survives the failed first load.
            expect(component.selectedAttendeeIds()).toEqual([13])
            expect(component.canCreate()).toBe(true)
            expect(document.activeElement).toBe(byTestId(fixture, 'people-grid')?.querySelector('button'))
        })

        it('leaves focus alone when the person moved it while the people were loading again', async () => {
            const { fixture, api } = await setup({}, group, down())
            const retried = new Subject<PeopleAnswer>()
            api.getGroupPeople.mockReturnValue(retried)
            fixture.detectChanges()
            byTestId(fixture, 'people-retry')?.click()
            const elsewhere = page(fixture).querySelector<HTMLInputElement>('input[type="date"]') as HTMLInputElement
            elsewhere.focus()

            retried.next({ people: [organizerPerson, guest] })
            retried.complete()
            await fixture.whenStable()
            fixture.detectChanges()
            await fixture.whenStable()
            expect(document.activeElement).toBe(elsewhere)
        })

        it('shows the message again when Retry fails too', async () => {
            const { fixture, component, api } = await setup({}, group, down())
            api.getGroupPeople.mockReturnValue(down())
            fixture.detectChanges()
            byTestId(fixture, 'people-retry')?.click()
            await fixture.whenStable()
            fixture.detectChanges()

            expect(byTestId(fixture, 'people-error')).not.toBeNull()
            expect(byTestId(fixture, 'people-loading')).toBeNull()
            expect(component.canCreate()).toBe(false)
        })

        it('ignores an answer that arrives after the group went away', async () => {
            const slowPeople = new Subject<PeopleAnswer>()
            const { fixture, component, dataService } = await setup({}, group, slowPeople)
            dataService.userGroups.set([])
            fixture.detectChanges()
            slowPeople.error(new Error('late failure'))
            await fixture.whenStable()

            expect(component.peopleError()).toBe(false)
            expect(component.peopleLoading()).toBe(false)
        })

        it('still invites member accounts in a group that has no group people', async () => {
            const { fixture, component, api } = await setup()
            fixture.detectChanges()

            expect(byTestId(fixture, 'people-error')).toBeNull()
            expect(byTestId(fixture, 'people-grid')).not.toBeNull()
            expect(api.getGroupPersonCatalog).not.toHaveBeenCalled()
            expect(component.canCreate()).toBe(true)
        })
    })
})
