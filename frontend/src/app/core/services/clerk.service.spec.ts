import { TestBed } from '@angular/core/testing'
import { NavigationEnd, NavigationStart, Router } from '@angular/router'
import { Subject } from 'rxjs'

import { afterFirstPagePaint, ClerkService } from './clerk.service'
import { THEME_COLORS, ThemeService } from './theme.service'

describe('ClerkService loading', () => {
    it('starts loading only when the first page has painted', async () => {
        const service = TestBed.inject(ClerkService)
        const load = vi.spyOn(service as unknown as { load: () => Promise<void> }, 'load').mockResolvedValue()
        let painted!: () => void

        service.initialize(new Promise<void>((resolve) => (painted = resolve)))
        expect(load).not.toHaveBeenCalled()

        painted()
        await Promise.resolve()
        expect(load).toHaveBeenCalledTimes(1)
    })

    it('starts at once when something needs the session first, and loads only once', async () => {
        const service = TestBed.inject(ClerkService)
        const load = vi.spyOn(service as unknown as { load: () => Promise<void> }, 'load').mockResolvedValue()
        let painted!: () => void
        service.initialize(new Promise<void>((resolve) => (painted = resolve)))

        await service.whenLoaded()
        painted()
        await Promise.resolve()
        await service.getToken()

        expect(load).toHaveBeenCalledTimes(1)
    })
})

describe('ClerkService appearance', () => {
    const setup = () => {
        const service = TestBed.inject(ClerkService)
        const clerk = { openSignIn: vi.fn(), openSignUp: vi.fn(), openUserProfile: vi.fn() }
        ;(service as unknown as { clerk: typeof clerk }).clerk = clerk
        service.isSelfRegistrationEnabled.set(true)
        return { service, clerk, theme: TestBed.inject(ThemeService) }
    }
    const primaryOf = (mock: ReturnType<typeof vi.fn>) => mock.mock.lastCall?.[0]?.appearance?.variables?.colorPrimary

    it('opens every Clerk panel in the theme chosen now, not the one Clerk loaded with', () => {
        const { service, clerk, theme } = setup()

        theme.palette.set('felt')
        service.openUserProfile()
        service.openSignIn()
        service.openSignUp()

        expect(primaryOf(clerk.openUserProfile)).toBe(THEME_COLORS.felt.primary)
        expect(primaryOf(clerk.openSignIn)).toBe(THEME_COLORS.felt.primary)
        expect(primaryOf(clerk.openSignUp)).toBe(THEME_COLORS.felt.primary)
        expect(clerk.openSignIn.mock.lastCall?.[0]?.withSignUp).toBe(true)

        theme.palette.set('harbor')
        service.openUserProfile()

        expect(primaryOf(clerk.openUserProfile)).toBe(THEME_COLORS.harbor.primary)
    })
})

describe('afterFirstPagePaint', () => {
    it('waits for the first navigation to finish, then for a painted frame', async () => {
        vi.useFakeTimers()
        const events = new Subject<unknown>()
        let done = false
        void afterFirstPagePaint({ events } as unknown as Router).then(() => (done = true))

        events.next(new NavigationStart(1, '/'))
        await vi.runAllTimersAsync()
        expect(done).toBe(false)

        events.next(new NavigationEnd(1, '/', '/'))
        await vi.runAllTimersAsync()
        expect(done).toBe(true)
        vi.useRealTimers()
    })
})

describe('ClerkService.forgetSession', () => {
    it('clears the signed-in user Board Vault reads, but keeps Clerk loaded for the next sign-in', () => {
        const service = TestBed.inject(ClerkService)
        const clerk = { openSignIn: vi.fn() }
        ;(service as unknown as { clerk: typeof clerk }).clerk = clerk
        service.isSignedIn.set(true)
        service.userId.set('user_7')
        service.username.set('ana')
        service.primaryEmail.set('ana@example.com')

        service.forgetSession()

        expect([service.isSignedIn(), service.userId(), service.username(), service.primaryEmail()]).toEqual([false, null, null, null])
        service.openSignIn()
        expect(clerk.openSignIn).toHaveBeenCalled()
    })
})

describe('ClerkService after forgetting a session', () => {
    const setup = () => {
        const service = TestBed.inject(ClerkService)
        const getToken = vi.fn().mockResolvedValue('token')
        const clerk = {
            isSignedIn: true,
            session: { id: 'sess_deleted', getToken },
            user: { id: 'user_7', username: 'ana', primaryEmailAddress: { emailAddress: 'ana@example.com' } },
        }
        ;(service as unknown as { clerk: typeof clerk }).clerk = clerk
        ;(service as unknown as { loaded: Promise<void> }).loaded = Promise.resolve()
        const syncState = () => (service as unknown as { syncState: () => void }).syncState()
        syncState()
        return { service, clerk, syncState, getToken }
    }

    it('does not come back when Clerk reports the same session again', async () => {
        const { service, syncState, getToken } = setup()

        service.forgetSession()
        syncState()

        expect(service.isSignedIn()).toBe(false)
        expect(service.userId()).toBeNull()
        await expect(service.getToken()).resolves.toBeNull()
        expect(getToken).not.toHaveBeenCalled()
    })

    it('lets a new sign-in through', async () => {
        const { service, clerk, syncState } = setup()

        service.forgetSession()
        clerk.session = { id: 'sess_new', getToken: vi.fn().mockResolvedValue('new-token') }
        syncState()

        expect(service.isSignedIn()).toBe(true)
        expect(service.userId()).toBe('user_7')
        await expect(service.getToken()).resolves.toBe('new-token')
    })
})
