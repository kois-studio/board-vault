import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router'
import { of } from 'rxjs'
import { Api } from '../../../api/api'
import { ToastService } from '../../../components/toast/toast.service'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
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

    const setup = async (query: Record<string, string> = {}) => {
        const dataService = {
            currentUser: signal({ id: 1 }),
            userGroups: signal([group]),
            userGroupsError: signal(false),
            invitationsGroupIndex: signal({ 7: [{ id: 30, toAccountId: 3, toAccount: { id: 3, username: 'invited' } }] }),
            addInvitedToGroup: vi.fn(() => of({})),
            inviteNewPersonToGroup: vi.fn(() =>
                of({ invitationId: 'inv_1', emailAddress: 'ana@example.com', url: 'https://example.test' }),
            ),
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
                        getClerkGroupInvitations: vi.fn(() => of([])),
                    },
                },
                { provide: DataService, useValue: dataService },
                { provide: LoadingService, useValue: { loadingStatesIndex: signal({}) } },
                { provide: ToastService, useValue: { success: vi.fn(), error: vi.fn() } },
            ],
        }).compileComponents()
        const fixture = TestBed.createComponent(GroupEditComponent)
        fixture.detectChanges()
        await fixture.whenStable()
        return { fixture, component: fixture.componentInstance, dataService }
    }

    const submit = (component: GroupEditComponent, value: string) => {
        component.inviteTarget.setValue(value)
        component.onInviteSubmit(new Event('submit') as SubmitEvent)
    }

    it('sends an email invitation for an address, and an in-app one for a username', async () => {
        const { component, dataService } = await setup()

        submit(component, 'ana@example.com')
        expect(component.inviteKind()).toBe('email')
        expect(dataService.inviteNewPersonToGroup).toHaveBeenCalledWith(7, 'ana@example.com', null)

        await vi.waitFor(() => expect(component.isLoading()).toBe(false))
        submit(component, 'leo_plays')
        await vi.waitFor(() => expect(component.isLoading()).toBe(false))
        expect(dataService.addInvitedToGroup).toHaveBeenCalledWith(7, 'leo_plays', null)
    })

    it('explains what is wrong before sending anything', async () => {
        const { component, dataService } = await setup()

        const cases: Array<[string, string]> = [
            ['', 'Enter their username or email.'],
            ['ana@', 'Enter a valid email address.'],
            ['abc', 'Usernames have 4 to 20 characters.'],
            ['Member', 'They are already in this group.'],
            ['invited', 'They already have an invitation waiting.'],
        ]
        for (const [value, problem] of cases) {
            submit(component, value)
            expect(component.inviteProblem()).toBe(problem)
        }
        expect(dataService.addInvitedToGroup).not.toHaveBeenCalled()
        expect(dataService.inviteNewPersonToGroup).not.toHaveBeenCalled()
    })

    it('opens with the person to invite already chosen when coming from their card', async () => {
        const { component, dataService } = await setup({ person: '32' })

        expect(component.claimablePeople().map(({ person }) => person.displayName)).toEqual(['Ana', 'Leo'])
        expect(component.selectedClaimPersonId()).toBe(32)
        submit(component, 'leo@example.com')
        expect(dataService.inviteNewPersonToGroup).toHaveBeenCalledWith(7, 'leo@example.com', 32)
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
})
