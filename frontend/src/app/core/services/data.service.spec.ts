import { TestBed } from '@angular/core/testing'
import { firstValueFrom, of, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { UserType } from '../../api/api.types'
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
