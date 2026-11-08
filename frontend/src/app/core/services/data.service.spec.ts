import { HttpContext, HttpErrorResponse } from '@angular/common/http'
import { TestBed } from '@angular/core/testing'
import { firstValueFrom, of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { UserType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { RETRY_READ } from '../interceptors/resilience.interceptor'
import { ConnectivityService } from './connectivity.service'
import { DataService } from './data.service'

describe('DataService account refresh', () => {
    const user: UserType = {
        id: 1,
        email: 'organizer+clerk_test@example.com',
        username: 'organizer',
        displayName: 'Organizer',
        avatar: { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'OR' },
        createdAt: '2026-09-01T10:00:00.000Z',
    }

    const setup = (
        answer: () => ReturnType<Api['getUserById']>,
        sync: () => ReturnType<Api['syncFromClerk']> = () => of({ username: 'unchanged', email: 'unchanged' }),
    ) => {
        const getUserById = vi.fn(answer)
        const syncFromClerk = vi.fn(sync)
        // Every other read the service starts for a signed-in user answers empty.
        const api = new Proxy(
            {},
            { get: (_target, name) => (name === 'getUserById' ? getUserById : name === 'syncFromClerk' ? syncFromClerk : () => of([])) },
        )

        TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: api }] })
        const service = TestBed.inject(DataService)
        service.currentUser.set(structuredClone(user))
        TestBed.tick()
        return { service, getUserById, syncFromClerk }
    }

    it('takes the username the server has now', async () => {
        const { service, getUserById } = setup(() => of({ ...user, username: 'organizer2' }))

        await service.refreshCurrentUser()

        expect(getUserById).toHaveBeenCalledWith(1)
        expect(service.currentUser()?.username).toBe('organizer2')
    })

    it('keeps the same user object when nothing changed, so nothing reloads', async () => {
        const { service } = setup(() => of({ ...user }))
        const before = service.currentUser()

        await service.refreshCurrentUser()

        expect(service.currentUser()).toBe(before)
    })

    it('keeps what it has when the read fails', async () => {
        const { service } = setup(() => throwError(() => new Error('offline')))
        const before = service.currentUser()

        await expect(service.refreshCurrentUser()).resolves.toBeUndefined()

        expect(service.currentUser()).toBe(before)
    })

    it('copies from Clerk, then takes the new username', async () => {
        const { service, syncFromClerk } = setup(
            () => of({ ...user, username: 'organizer2' }),
            () => of({ username: 'updated', email: 'unchanged' }),
        )

        await expect(service.syncFromClerk()).resolves.toEqual({ username: 'updated', email: 'unchanged' })

        expect(syncFromClerk).toHaveBeenCalledTimes(1)
        expect(service.currentUser()?.username).toBe('organizer2')
    })

    it('reads nothing again when Clerk had nothing new to copy', async () => {
        const { service, getUserById } = setup(
            () => of({ ...user }),
            () => of({ username: 'taken', email: 'unchanged' }),
        )

        await expect(service.syncFromClerk()).resolves.toEqual({ username: 'taken', email: 'unchanged' })

        expect(getUserById).not.toHaveBeenCalled()
    })

    it('answers null when the copy fails', async () => {
        const { service } = setup(
            () => of({ ...user }),
            () => throwError(() => new Error('offline')),
        )

        await expect(service.syncFromClerk()).resolves.toBeNull()
    })
})

describe('DataService answering a session', () => {
    it('updates the answer in the session list and confirms it', async () => {
        const updateSessionRsvp = vi.fn(() => of({ sessionId: 21, rsvpStatus: 'declined' as const }))
        const api = new Proxy({}, { get: (_target, name) => (name === 'updateSessionRsvp' ? updateSessionRsvp : () => of([])) })
        TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: api }] })
        const service = TestBed.inject(DataService)
        const session = {
            groupId: 7,
            createdBy: 1,
            meetDate: '2026-10-09T17:00:00.000Z',
            isConfirmed: false,
            status: 'scheduled' as const,
            timezone: 'UTC',
            notes: null,
            myRsvpStatus: 'pending' as const,
            gamesToBring: [],
        }
        service.userMeets.set([
            { ...session, id: 21 },
            { ...session, id: 22 },
        ])

        await firstValueFrom(service.answerSession(21, 'declined'))

        expect(updateSessionRsvp).toHaveBeenCalledWith(21, { rsvpStatus: 'declined' })
        expect(service.userMeets().map((meet) => meet.myRsvpStatus)).toEqual(['declined', 'pending'])
    })
})

describe('DataService inbox', () => {
    const notification = (id: number, isRead = false) => ({
        id,
        accountId: 1,
        type: 'user_joined_group',
        message: `Note ${id}`,
        createdAt: '2026-10-15T18:19:05.000Z',
        isRead,
        data: { account: 2, group: 10 },
    })

    const setup = (api: Record<string, unknown>) => {
        const toast = { success: vi.fn(), error: vi.fn() }
        const fake = new Proxy(api, { get: (target, name) => (name in target ? target[name as string] : () => of([])) })
        TestBed.configureTestingModule({
            providers: [
                { provide: Api, useValue: fake },
                { provide: ToastService, useValue: toast },
            ],
        })
        const service = TestBed.inject(DataService)
        return { service, toast }
    }

    it('marks the rest read when one fails, drops one deleted elsewhere, and says how many failed', () => {
        const updateNotification = vi.fn((id: number) =>
            id === 2 ? throwError(() => ({ status: 500 })) : id === 3 ? throwError(() => ({ status: 404 })) : of({ success: true }),
        )
        const { service, toast } = setup({ updateNotification })
        service.userNotifications.set([notification(1), notification(2), notification(3), notification(4, true)])

        service.markAllNotificationsRead()

        expect(updateNotification).toHaveBeenCalledTimes(3)
        expect(service.userNotifications().map((item) => [item.id, item.isRead])).toEqual([
            [1, true],
            [2, false],
            [4, true],
        ])
        expect(toast.error).toHaveBeenCalledWith('1 notification could not be marked as read')
        expect(toast.success).not.toHaveBeenCalled()
    })

    it('counts several failures in the plural', () => {
        const { service, toast } = setup({ updateNotification: vi.fn(() => throwError(() => ({ status: 500 }))) })
        service.userNotifications.set([notification(1), notification(2)])

        service.markAllNotificationsRead()

        expect(toast.error).toHaveBeenCalledWith('2 notifications could not be marked as read')
    })

    it('says all were marked when none failed', () => {
        const { service, toast } = setup({ updateNotification: vi.fn(() => of({ success: true })) })
        service.userNotifications.set([notification(1), notification(2)])

        service.markAllNotificationsRead()

        expect(service.userNotifications().every((item) => item.isRead)).toBe(true)
        expect(toast.success).toHaveBeenCalledWith('All notifications marked as read')
    })

    it('leaves retrying quiet refreshes to the next refresh, but lets the first load be tried again (#240)', () => {
        const api = {
            getUserNotifications: vi.fn((_id: number, _context?: HttpContext) => of([])),
            getUserInvitations: vi.fn((_id: number, _context?: HttpContext) => of([])),
            getUserMeets: vi.fn((_id: number, _context?: HttpContext) => of([])),
        }
        const { service } = setup(api)
        service.currentUser.set({ id: 1 } as never)
        TestBed.tick()
        const retried = (mock: (typeof api)['getUserMeets']) => mock.mock.calls.map(([, context]) => context?.get(RETRY_READ) ?? true)

        service.refreshSharedActivity(true)

        for (const mock of [api.getUserNotifications, api.getUserInvitations, api.getUserMeets]) {
            expect(retried(mock).at(-1)).toBe(false)
        }
        // The loads at sign-in show an error when they fail, so they keep the one retry.
        expect(retried(api.getUserNotifications)[0]).toBe(true)
    })

    it('counts an arrival only when a look brings an unread notification or invitation it did not have', () => {
        let answer = [notification(1)]
        const { service } = setup({ getUserNotifications: vi.fn(() => of(answer)), getUserInvitations: vi.fn(() => of([])) })
        service.currentUser.set({ id: 1 } as never)
        TestBed.tick()
        expect(service.inboxArrivals()).toBe(0)

        service.refreshInbox()
        expect(service.inboxArrivals()).toBe(0)

        answer = [notification(1), notification(2)]
        service.refreshInbox()
        expect(service.inboxArrivals()).toBe(1)

        // Something new that is already read is not news.
        answer = [notification(1), notification(2), notification(3, true)]
        service.refreshInbox()
        expect(service.inboxArrivals()).toBe(1)
    })

    it('counts an unread notification that came back updated, and shows what it says now', () => {
        let answer = [notification(1)]
        const { service } = setup({ getUserNotifications: vi.fn(() => of(answer)), getUserInvitations: vi.fn(() => of([])) })
        service.currentUser.set({ id: 1 } as never)
        TestBed.tick()

        answer = [{ ...notification(1), message: 'Ana added Catan and Azul to their shelf.', createdAt: '2026-10-15T18:25:00.000Z' }]
        service.refreshInbox()

        expect(service.inboxArrivals()).toBe(1)
        expect(service.userNotifications()[0]?.message).toBe('Ana added Catan and Azul to their shelf.')

        // The same answer again is not news.
        service.refreshInbox()
        expect(service.inboxArrivals()).toBe(1)
    })

    it('ignores a look still on its way once the person reads something meanwhile', () => {
        const pending = new Subject<Array<ReturnType<typeof notification>>>()
        const { service } = setup({
            getUserNotifications: vi.fn(() => of([notification(1)])),
            getUserInvitations: vi.fn(() => of([])),
            updateNotification: vi.fn(() => of({ success: true })),
        })
        service.currentUser.set({ id: 1 } as never)
        TestBed.tick()
        ;(TestBed.inject(Api) as unknown as { getUserNotifications: ReturnType<typeof vi.fn> }).getUserNotifications.mockReturnValue(
            pending,
        )

        service.refreshInbox()
        service.updateNotification(1, { announce: false })
        pending.next([notification(1)])

        expect(service.userNotifications()[0]?.isRead).toBe(true)
    })

    it('reloads the inbox quietly, and keeps what is shown when a read fails', () => {
        const getUserNotifications = vi.fn(() => of([notification(9)]))
        const getUserInvitations = vi.fn<() => ReturnType<Api['getUserInvitations']>>(() => of([]))
        const { service, toast } = setup({ getUserNotifications, getUserInvitations })
        service.currentUser.set({ id: 1 } as never)
        TestBed.tick()
        service.userInvitations.set([{ id: 5 }] as never)
        // From here on the invitations read fails; the first load above went through.
        getUserInvitations.mockImplementation(() => throwError(() => new Error('offline')))
        toast.error.mockClear()

        service.refreshInbox()

        expect(service.userNotifications().map((item) => item.id)).toEqual([9])
        expect(service.userInvitations()).toEqual([{ id: 5 }])
        expect(toast.error).not.toHaveBeenCalled()
    })
})

describe('DataService while Board Vault cannot be reached (#241)', () => {
    const unavailable = () => throwError(() => new HttpErrorResponse({ status: 503, statusText: 'Service Unavailable' }))

    /** Every read answers empty except those in `failing`, which answer 503 while `down.value` is true. */
    const setup = (failing: Array<string>, extra: Record<string, unknown> = {}) => {
        const down = { value: true }
        const calls: Record<string, number> = {}
        const toast = { success: vi.fn(), error: vi.fn() }
        const fake = new Proxy(extra, {
            get: (target, name) => {
                const key = name as string
                if (key in target) return target[key]
                return () => {
                    calls[key] = (calls[key] ?? 0) + 1
                    return failing.includes(key) && down.value ? unavailable() : of([])
                }
            },
        })
        TestBed.configureTestingModule({
            providers: [
                { provide: Api, useValue: fake },
                { provide: ToastService, useValue: toast },
            ],
        })
        const service = TestBed.inject(DataService)
        const connectivity = TestBed.inject(ConnectivityService)
        const signIn = (id = 1) => {
            service.currentUser.set({ id } as never)
            TestBed.tick()
        }
        return { service, connectivity, toast, calls, down, signIn }
    }

    const allLists = [
        'getUserGames',
        'getUserGroups',
        'getUserNotifications',
        'getUserInvitations',
        'getUserReviews',
        'getUserMeets',
        'getUserGamesHistory',
        'getUserWishlist',
        'getUserCollectionActivity',
        'getUserProposals',
        'getUserProposalStats',
        'getUserStats',
    ]

    it('still toasts a list that failed while Board Vault is reachable', () => {
        const { toast, signIn } = setup(['getUserGames'])

        signIn()

        expect(toast.error).toHaveBeenCalledTimes(1)
        expect(toast.error).toHaveBeenCalledWith('Error retrieving user games')
    })

    it('shows no toast stack when every list fails during an outage: the banner says it', () => {
        const { service, connectivity, toast, signIn } = setup(allLists)
        connectivity.reportUnreachable()

        signIn()

        expect(toast.error).not.toHaveBeenCalled()
        // Each list still knows it failed, so its page can say so in place.
        expect(service.userGamesError()).toBe(true)
        expect(service.userGroupsError()).toBe(true)
        expect(service.userStatsError()).toBe(true)
    })

    it('leaves out the toast for a group’s invitations during an outage', () => {
        const { connectivity, toast, signIn } = setup(['getGroupInvitations'], {
            getUserGroups: () => of([{ id: 10, name: 'Friday Crew', createdBy: 1, members: [] }]),
        })
        connectivity.reportUnreachable()

        signIn()

        expect(toast.error).not.toHaveBeenCalled()
    })

    it('loads what failed again on Try again, and nothing that loaded', () => {
        const { service, connectivity, calls, down, signIn } = setup(['getUserGames', 'getUserStats'])
        connectivity.reportUnreachable()
        signIn()
        expect(service.userGamesError()).toBe(true)
        down.value = false

        connectivity.retry()

        expect(calls['getUserGames']).toBe(2)
        expect(calls['getUserStats']).toBe(2)
        expect(calls['getUserReviews']).toBe(1)
        expect(service.userGamesError()).toBe(false)
        expect(service.userStatsError()).toBe(false)
        // The quiet refresh always asks, so Try again also finds out whether Board Vault answers.
        expect(calls['getUserMeets']).toBe(2)
    })

    it('loads only that group’s invitations again, not the groups', () => {
        const { connectivity, calls, down, signIn } = setup(['getGroupInvitations'], {
            getUserGroups: vi.fn(() => of([{ id: 10, name: 'Friday Crew', createdBy: 1, members: [] }])),
        })
        signIn()
        down.value = false

        connectivity.retry()

        expect(calls['getGroupInvitations']).toBe(2)
    })

    it('keeps trying what still fails, without repeating anything else', () => {
        const { connectivity, calls, signIn } = setup(['getUserGames'])
        connectivity.reportUnreachable()
        signIn()

        connectivity.retry()
        connectivity.retry()

        expect(calls['getUserGames']).toBe(3)
        expect(calls['getUserStats']).toBe(1)
    })

    it('does not reload a list that loaded again by other means since it failed', () => {
        const { service, connectivity, calls, down, signIn } = setup(['getUserStats'])
        signIn()
        down.value = false
        service.refreshUserStats()

        connectivity.retry()

        expect(calls['getUserStats']).toBe(2)
    })

    it('forgets what failed for one person once another signs in', () => {
        const { connectivity, calls, down, signIn } = setup(['getUserGames'])
        signIn(1)
        down.value = false
        signIn(2)

        connectivity.retry()

        // Sign-in for each person, and no reload for the first one.
        expect(calls['getUserGames']).toBe(2)
    })

    it('does nothing on Try again when nobody is signed in', () => {
        const { connectivity, calls } = setup(allLists)

        connectivity.retry()

        expect(Object.keys(calls)).toEqual([])
    })
})

describe('DataService saving the profile (#242)', () => {
    const user: UserType = {
        id: 1,
        email: 'organizer+clerk_test@example.com',
        username: 'organizer',
        displayName: 'Organizer',
        avatar: { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'OR' },
        createdAt: '2026-09-01T10:00:00.000Z',
    }
    const group = {
        id: 4,
        members: [
            { id: 1, displayName: 'Organizer', avatar: user.avatar },
            { id: 2, displayName: 'Friend', avatar: user.avatar },
        ],
    }

    const setup = (update: () => ReturnType<Api['updateUser']>, read: () => ReturnType<Api['getUserById']>) => {
        const updateUser = vi.fn(update)
        const getUserById = vi.fn(read)
        const api = new Proxy(
            {},
            { get: (_target, name) => (name === 'updateUser' ? updateUser : name === 'getUserById' ? getUserById : () => of([])) },
        )
        TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: api }] })
        const service = TestBed.inject(DataService)
        const toast = TestBed.inject(ToastService)
        service.currentUser.set(structuredClone(user))
        TestBed.tick()
        service.userGroups.set([structuredClone(group)] as unknown as ReturnType<DataService['userGroups']>)
        const success = vi.spyOn(toast, 'success')
        const error = vi.spyOn(toast, 'error')
        return { service, updateUser, getUserById, success, error }
    }

    it('resolves once saved, with the account and its place in each group updated', async () => {
        const { service, updateUser, success } = setup(
            () => of({ success: true }),
            () => of({ ...user, displayName: 'Host' }),
        )

        await service.updateCurrentUserData({ displayName: 'Host' })

        expect(updateUser).toHaveBeenCalledWith(1, { displayName: 'Host' })
        expect(service.currentUser()?.displayName).toBe('Host')
        expect(service.userGroups()[0]?.members.map((member) => member.displayName)).toEqual(['Host', 'Friend'])
        expect(success).toHaveBeenCalledTimes(1)
    })

    it('rejects when not saved, and changes nothing or toasts: the caller says it next to its control', async () => {
        const { service, getUserById, success, error } = setup(
            () => throwError(() => new HttpErrorResponse({ status: 503 })),
            () => of(user),
        )
        const before = service.currentUser()
        const groupsBefore = service.userGroups()

        await expect(service.updateCurrentUserData({ displayName: 'Host' })).rejects.toBeInstanceOf(HttpErrorResponse)

        expect(service.currentUser()).toBe(before)
        expect(service.userGroups()).toBe(groupsBefore)
        expect(getUserById).not.toHaveBeenCalled()
        expect(success).not.toHaveBeenCalled()
        expect(error).not.toHaveBeenCalled()
    })

    it('applies the change as sent when it was saved but could not be read back', async () => {
        const { service } = setup(
            () => of({ success: true }),
            () => throwError(() => new HttpErrorResponse({ status: 503 })),
        )
        const avatar = { ...user.avatar, backgroundColor: '#10B981' }

        await service.updateCurrentUserData({ avatar })

        expect(service.currentUser()).toMatchObject({ displayName: 'Organizer', avatar })
        expect(service.userGroups()[0]?.members[0]?.avatar).toEqual(avatar)
    })

    it('applies it to the account as read meanwhile, when it was saved but could not be read back', async () => {
        const answer = new Subject<{ success: true }>()
        const { service } = setup(
            () => answer,
            () => throwError(() => new HttpErrorResponse({ status: 503 })),
        )

        const saving = service.updateCurrentUserData({ displayName: 'Host' })
        service.currentUser.update((current) => current && { ...current, username: 'organizer-2' })
        answer.next({ success: true })
        answer.complete()
        await saving

        expect(service.currentUser()).toMatchObject({ username: 'organizer-2', displayName: 'Host' })
    })

    it('does not put the saved account back when someone else signed in meanwhile', async () => {
        const answer = new Subject<{ success: true }>()
        const { service } = setup(
            () => answer,
            () => of({ ...user, displayName: 'Host' }),
        )

        const saving = service.updateCurrentUserData({ displayName: 'Host' })
        service.currentUser.set(null)
        answer.next({ success: true })
        answer.complete()
        await saving

        expect(service.currentUser()).toBeNull()
    })

    it('rejects without a request when nobody is signed in', async () => {
        const { service, updateUser } = setup(
            () => of({ success: true }),
            () => of(user),
        )
        service.currentUser.set(null)

        await expect(service.updateCurrentUserData({ displayName: 'Host' })).rejects.toThrow()
        expect(updateUser).not.toHaveBeenCalled()
    })
})
