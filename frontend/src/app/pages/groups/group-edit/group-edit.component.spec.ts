import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { type Observable, of, Subject, throwError } from 'rxjs'
import { Api } from '../../../api/api'
import { ToastService } from '../../../components/toast/toast.service'
import { type ResourceStatus } from '../../../core/async/resource-state'
import { stateOf } from '../../../core/async/resource-state.testing'
import { DataService } from '../../../core/services/data.service'
import { GroupEditComponent } from './group-edit.component'

describe('GroupEditComponent (Manage group)', () => {
    const group = {
        id: 7,
        name: 'Fridays',
        createdBy: 1,
        members: [
            { id: 1, username: 'owner', displayName: 'Owner', avatar: null, games: [], reviews: [] },
            { id: 2, username: 'member', displayName: 'Member', avatar: null, games: [], reviews: [] },
        ],
    }
    const placeholder = (id: number, displayName: string) => ({
        person: { id, displayName, kind: 'placeholder', status: 'active', accountId: null },
        ownership: [],
        preferences: [],
        claimable: false,
    })

    const setup = async (query: Record<string, string> = {}, loadingGroups = false, groups = { list: [group], failed: false }) => {
        const groupsStatus = signal<ResourceStatus>(loadingGroups ? 'loading' : groups.failed ? 'error' : 'ready')
        const userGroups = signal(groups.list)
        const dataService = {
            currentUser: signal({ id: 1 }),
            userGroups,
            userGroupsState: stateOf(userGroups, groupsStatus),
            refreshUserGroups: vi.fn(),
            invitationsGroupIndex: signal({ 7: [{ id: 30, toAccountId: 3, toAccount: { id: 3, username: 'invited' } }] }),
            addInvitedToGroup: vi.fn(() => of({})),
            removeMemberFromGroup: vi.fn(() => of({})),
            removeInvitedFromGroup: vi.fn(() => of({})),
        }
        await TestBed.configureTestingModule({
            imports: [GroupEditComponent],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: { snapshot: { paramMap: convertToParamMap({ groupId: '7' }), queryParamMap: convertToParamMap(query) } },
                },
                {
                    provide: Api,
                    useValue: {
                        getGroupPeople: vi.fn(() => of({ people: [placeholder(31, 'Ana'), placeholder(32, 'Leo')] })),
                    },
                },
                { provide: DataService, useValue: dataService },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        }).compileComponents()
        const fixture = TestBed.createComponent(GroupEditComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        return { fixture, component: fixture.componentInstance, dataService, groupsStatus }
    }

    const submit = (component: GroupEditComponent, value: string) => {
        component.inviteTarget.setValue(value)
        component.onInviteSubmit(new Event('submit') as SubmitEvent)
    }

    it('leads back to the group from the address, before the group has loaded', async () => {
        const { fixture, component } = await setup({}, true)

        expect(component.isResolvingGroup()).toBe(true)
        const back = fixture.nativeElement.querySelector('a[appBackLink]') as HTMLAnchorElement
        expect(back.getAttribute('href')).toBe('/groups/7')
        expect(back.textContent?.trim()).toBe('Back to group workspace')
        // The layout already gives the page its <main>.
        expect(fixture.nativeElement.querySelector('main')).toBeNull()
    })

    it('says the group could not be loaded, with Retry, when your groups failed to load, never that it is gone (#248)', async () => {
        const { fixture, dataService } = await setup({}, false, { list: [], failed: true })
        fixture.detectChanges()
        const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement

        expect(alert.textContent).toContain('This group could not be loaded.')
        expect(fixture.nativeElement.textContent).not.toContain('This group is not available.')
        ;(alert.querySelector('button') as HTMLButtonElement).click()
        expect(dataService.refreshUserGroups).toHaveBeenCalledTimes(1)
    })

    it('shows Loading while Retry loads the groups again, never "not available", then the group', async () => {
        const { fixture, dataService, groupsStatus } = await setup({}, false, { list: [], failed: true })
        fixture.detectChanges()
        const text = () => (fixture.nativeElement as HTMLElement).textContent ?? ''

        ;(fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click()
        // What the real refresh does: loading again, with nothing loaded before.
        groupsStatus.set('loading')
        fixture.detectChanges()
        expect(text()).toContain('Loading group management')
        expect(text()).not.toContain('This group is not available.')
        expect(text()).not.toContain('This group could not be loaded.')

        dataService.userGroups.set([group])
        groupsStatus.set('ready')
        fixture.detectChanges()
        expect(text()).not.toContain('Loading group management')
        expect(fixture.nativeElement.querySelector('[role="alert"]')).toBeNull()
        expect(text()).toContain('Fridays')
    })

    it('shows the failure again when Retry fails too', async () => {
        const { fixture, groupsStatus } = await setup({}, false, { list: [], failed: true })
        fixture.detectChanges()

        ;(fixture.nativeElement.querySelector('[role="alert"] button') as HTMLButtonElement).click()
        groupsStatus.set('loading')
        fixture.detectChanges()
        groupsStatus.set('error')
        fixture.detectChanges()

        expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('This group could not be loaded.')
    })

    it('says the group is not available when your groups loaded without it', async () => {
        const { fixture } = await setup({}, false, { list: [], failed: false })
        fixture.detectChanges()

        expect(fixture.nativeElement.querySelector('[role="alert"]')?.textContent).toContain('This group is not available.')
        expect(fixture.nativeElement.textContent).not.toContain('This group could not be loaded.')
    })

    it('invites by username, and sends nothing for an email address (#277)', async () => {
        const { component, dataService } = await setup()

        submit(component, 'ana@example.com')
        expect(component.inviteProblem()).toContain('not their email')
        expect(dataService.addInvitedToGroup).not.toHaveBeenCalled()

        submit(component, 'leo_plays')
        await vi.waitFor(() => expect(component.isLoading()).toBe(false))
        expect(dataService.addInvitedToGroup).toHaveBeenCalledWith(7, 'leo_plays', null)
    })

    it('explains what is wrong before sending anything', async () => {
        const { component, dataService } = await setup()

        const cases: Array<[string, string]> = [
            ['', 'Enter their username.'],
            ['ana@', "Use their Board Vault username, not their email. Ask them for it if you don't know it."],
            ['abc', 'Usernames have 4 to 20 characters.'],
            ['Member', 'They are already in this group.'],
            ['invited', 'They already have an invitation waiting.'],
        ]
        for (const [value, problem] of cases) {
            submit(component, value)
            expect(component.inviteProblem()).toBe(problem)
        }
        expect(dataService.addInvitedToGroup).not.toHaveBeenCalled()
    })

    it('opens with the person to invite already chosen when coming from their card', async () => {
        const { component, dataService } = await setup({ person: '32' })

        expect(component.claimablePeople().map(({ person }) => person.displayName)).toEqual(['Ana', 'Leo'])
        expect(component.selectedClaimPersonId()).toBe(32)
        submit(component, 'leo_plays')
        expect(dataService.addInvitedToGroup).toHaveBeenCalledWith(7, 'leo_plays', 32)
    })

    it('removes a member and withdraws an invitation at once, with no separate save', async () => {
        const { component, dataService } = await setup()

        component.pendingRemoval.set('m2')
        await component.removeMember(2)
        expect(dataService.removeMemberFromGroup).toHaveBeenCalledWith(7, 2)
        expect(component.pendingRemoval()).toBeNull()

        await component.withdrawInvitation(30)
        expect(dataService.removeInvitedFromGroup).toHaveBeenCalledWith(30)
    })
    describe('when the group people cannot be loaded', () => {
        const down = () => throwError(() => new Error('Board Vault could not be reached'))
        type PeopleAnswer = { people: Array<ReturnType<typeof placeholder>> }
        // The page loads the people once it knows you own the group: make that first load answer this way.
        const setupWith = async (answer: Observable<PeopleAnswer>, query: Record<string, string> = {}) => {
            const getGroupPeople = vi.fn<() => Observable<PeopleAnswer>>().mockReturnValue(answer)
            TestBed.overrideProvider(Api, { useValue: { getGroupPeople } })
            const result = await setup(query)
            result.fixture.detectChanges()
            const page = () => result.fixture.nativeElement as HTMLElement
            const byTestId = (id: string) => page().querySelector<HTMLElement>(`[data-testid="${id}"]`)
            const sendButton = () => page().querySelector<HTMLButtonElement>('form button[type="submit"]') as HTMLButtonElement
            return { ...result, getGroupPeople, page, byTestId, sendButton }
        }

        it('says an invitation cannot be linked to someone in the group, and still lets a plain invitation go', async () => {
            const { component, dataService, byTestId, sendButton, page } = await setupWith(down())

            expect(byTestId('people-error')?.getAttribute('role')).toBe('alert')
            expect(byTestId('people-error')?.textContent).toContain('can’t be linked to someone already in the group')
            expect(page().querySelector('#group-invite-person')).toBeNull()
            expect(sendButton().disabled).toBe(false)
            submit(component, 'ana_plays')
            expect(dataService.addInvitedToGroup).toHaveBeenCalledWith(7, 'ana_plays', null)
        })

        it('holds the invitation for a chosen person until the people load, so it is not sent unlinked', async () => {
            const { component, dataService, byTestId, sendButton } = await setupWith(down(), { person: '32' })

            expect(byTestId('people-error')).not.toBeNull()
            expect(sendButton().disabled).toBe(true)
            submit(component, 'leo_plays')
            expect(dataService.addInvitedToGroup).not.toHaveBeenCalled()
        })

        it('holds it while the people are still on their way, too', async () => {
            const slow = new Subject<PeopleAnswer>()
            const { fixture, component, dataService, byTestId, sendButton } = await setupWith(slow, { person: '32' })

            expect(byTestId('people-loading')?.getAttribute('role')).toBe('status')
            expect(sendButton().disabled).toBe(true)

            slow.next({ people: [placeholder(32, 'Leo')] })
            fixture.detectChanges()
            expect(sendButton().disabled).toBe(false)
            submit(component, 'leo_plays')
            expect(dataService.addInvitedToGroup).toHaveBeenCalledWith(7, 'leo_plays', 32)
        })

        it('loads them again on Retry, keeping the message until they arrive, then picks the person and moves focus to the menu', async () => {
            const { fixture, component, getGroupPeople, byTestId, page } = await setupWith(down(), { person: '32' })
            const retried = new Subject<PeopleAnswer>()
            getGroupPeople.mockReturnValue(retried)

            byTestId('people-retry')?.click()
            fixture.detectChanges()
            expect(getGroupPeople).toHaveBeenCalledTimes(2)
            expect(byTestId('people-error')).not.toBeNull()
            expect(byTestId('people-retry')?.getAttribute('aria-busy')).toBe('true')
            expect(byTestId('people-loading')).not.toBeNull()
            byTestId('people-retry')?.click()
            expect(getGroupPeople).toHaveBeenCalledTimes(2)

            retried.next({ people: [placeholder(31, 'Ana'), placeholder(32, 'Leo')] })
            fixture.detectChanges()
            await fixture.whenStable()

            expect(byTestId('people-error')).toBeNull()
            expect(component.selectedClaimPersonId()).toBe(32)
            expect(document.activeElement).toBe(page().querySelector('#group-invite-person'))
        })

        it('moves focus to the invite field after Retry when nobody can be linked', async () => {
            const { fixture, getGroupPeople, byTestId, page } = await setupWith(down())
            getGroupPeople.mockReturnValue(of({ people: [] }))

            byTestId('people-retry')?.click()
            fixture.detectChanges()
            await fixture.whenStable()

            expect(byTestId('people-error')).toBeNull()
            expect(document.activeElement).toBe(page().querySelector('#group-invite'))
        })

        it('shows the message again when Retry fails too', async () => {
            const { fixture, component, getGroupPeople, byTestId } = await setupWith(down(), { person: '32' })
            getGroupPeople.mockReturnValue(down())

            byTestId('people-retry')?.click()
            fixture.detectChanges()

            expect(byTestId('people-error')).not.toBeNull()
            expect(byTestId('people-loading')).toBeNull()
            expect(component.inviteWaitsForPeople()).toBe(true)
        })

        it('refreshes the people quietly after an invitation, without picking the person again or locking Send', async () => {
            const { fixture, component, dataService, getGroupPeople, byTestId, sendButton } = await setupWith(
                of({ people: [placeholder(31, 'Ana'), placeholder(32, 'Leo')] }),
                { person: '32' },
            )
            expect(component.selectedClaimPersonId()).toBe(32)
            submit(component, 'leo_plays')
            await fixture.whenStable()
            expect(component.selectedClaimPersonId()).toBeNull()

            // Sending updates the invitations, which runs the page's effect again.
            const refreshed = new Subject<PeopleAnswer>()
            getGroupPeople.mockReturnValue(refreshed)
            dataService.invitationsGroupIndex.set({ 7: [] })
            fixture.detectChanges()
            expect(getGroupPeople).toHaveBeenCalledTimes(2)
            expect(sendButton().disabled).toBe(false)
            expect(byTestId('people-loading')).toBeNull()

            refreshed.next({ people: [placeholder(31, 'Ana'), placeholder(32, 'Leo')] })
            fixture.detectChanges()
            expect(component.selectedClaimPersonId()).toBeNull()
        })

        it('keeps the people shown when a quiet refresh fails', async () => {
            const { fixture, component, dataService, getGroupPeople, byTestId } = await setupWith(of({ people: [placeholder(31, 'Ana')] }))
            getGroupPeople.mockReturnValue(down())
            dataService.invitationsGroupIndex.set({ 7: [] })
            fixture.detectChanges()

            expect(byTestId('people-error')).toBeNull()
            expect(component.claimablePeople().map(({ person }) => person.displayName)).toEqual(['Ana'])
        })

        it('applies only the newest answer when loads overlap', async () => {
            const first = new Subject<PeopleAnswer>()
            const { fixture, component, dataService, getGroupPeople } = await setupWith(first)
            getGroupPeople.mockReturnValue(of({ people: [placeholder(32, 'Leo')] }))
            dataService.invitationsGroupIndex.set({ 7: [] })
            fixture.detectChanges()
            expect(getGroupPeople).toHaveBeenCalledTimes(2)
            expect(component.claimablePeople().map(({ person }) => person.displayName)).toEqual(['Leo'])
            first.next({ people: [placeholder(31, 'Ana')] })
            fixture.detectChanges()

            expect(component.claimablePeople().map(({ person }) => person.displayName)).toEqual(['Leo'])
        })

        it('loads the people once, whatever the answer, rather than again on every change it makes', async () => {
            // Answers arrive later, as over the network, so they land outside the page's effect.
            const failing = new Subject<PeopleAnswer>()
            const failed = await setupWith(failing)
            failing.error(new Error('down'))
            failed.fixture.detectChanges()
            await failed.fixture.whenStable()
            expect(failed.byTestId('people-error')).not.toBeNull()
            expect(failed.getGroupPeople).toHaveBeenCalledTimes(1)

            TestBed.resetTestingModule()
            const answering = new Subject<PeopleAnswer>()
            const loaded = await setupWith(answering)
            answering.next({ people: [placeholder(31, 'Ana')] })
            loaded.fixture.detectChanges()
            await loaded.fixture.whenStable()
            expect(loaded.component.claimablePeople()).toHaveLength(1)
            expect(loaded.getGroupPeople).toHaveBeenCalledTimes(1)
        })

        it('does not load the people again when they arrive after an invitation sent while they were missing', async () => {
            const { fixture, component, dataService, getGroupPeople, byTestId } = await setupWith(down())
            const later = new Subject<PeopleAnswer>()
            getGroupPeople.mockReturnValue(later)
            submit(component, 'ana@example.com')
            await fixture.whenStable()
            dataService.invitationsGroupIndex.set({ 7: [] })
            fixture.detectChanges()
            expect(getGroupPeople).toHaveBeenCalledTimes(2)

            later.next({ people: [placeholder(31, 'Ana')] })
            fixture.detectChanges()
            await fixture.whenStable()
            expect(byTestId('people-error')).toBeNull()
            expect(getGroupPeople).toHaveBeenCalledTimes(2)
        })

        it('still says the people are missing when the page runs its effect again before the first answer', async () => {
            // As the page loads, groups and invitations arrive one after another and each runs the effect again.
            const first = new Subject<PeopleAnswer>()
            const { fixture, dataService, getGroupPeople, byTestId, sendButton } = await setupWith(first, { person: '32' })
            const again = new Subject<PeopleAnswer>()
            getGroupPeople.mockReturnValue(again)
            dataService.invitationsGroupIndex.set({ 7: [] })
            fixture.detectChanges()
            expect(sendButton().disabled).toBe(true)

            first.error(new Error('down'))
            again.error(new Error('down'))
            fixture.detectChanges()
            expect(byTestId('people-error')).not.toBeNull()
            expect(sendButton().disabled).toBe(true)
        })
    })
})
