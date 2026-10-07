import { TestBed } from '@angular/core/testing'
import { of, throwError } from 'rxjs'
import { Api } from '../../api/api'
import type { UserType } from '../../api/api.types'
import { DataService } from './data.service'

describe('DataService.refreshCurrentUser', () => {
    const user: UserType = {
        id: 1,
        email: 'organizer+clerk_test@example.com',
        username: 'organizer',
        displayName: 'Organizer',
        avatar: { backgroundColor: '#3B82F6', iconName: 'person-fill', emoji: null, type: 'icon', initials: 'OR' },
        createdAt: '2026-09-01T10:00:00.000Z',
    }

    const setup = (answer: () => ReturnType<Api['getUserById']>) => {
        const getUserById = vi.fn(answer)
        // Every other read the service starts for a signed-in user answers empty.
        const api = new Proxy({}, { get: (_target, name) => (name === 'getUserById' ? getUserById : () => of([])) })

        TestBed.configureTestingModule({ providers: [{ provide: Api, useValue: api }] })
        const service = TestBed.inject(DataService)
        service.currentUser.set(structuredClone(user))
        TestBed.tick()
        return { service, getUserById }
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
})
