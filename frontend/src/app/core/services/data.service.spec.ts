import { TestBed } from '@angular/core/testing'
import { firstValueFrom, of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { UserType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
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

    it('says all were marked when none failed', () => {
        const { service, toast } = setup({ updateNotification: vi.fn(() => of({ success: true })) })
        service.userNotifications.set([notification(1), notification(2)])

        service.markAllNotificationsRead()

        expect(service.userNotifications().every((item) => item.isRead)).toBe(true)
        expect(toast.success).toHaveBeenCalledWith('All notifications marked as read')
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
