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
        const clerk = { mountSignIn: vi.fn(), mountSignUp: vi.fn(), openUserProfile: vi.fn() }
        ;(service as unknown as { clerk: typeof clerk }).clerk = clerk
        service.isSelfRegistrationEnabled.set(true)
        return { service, clerk, theme: TestBed.inject(ThemeService) }
    }
    const primaryOf = (mock: ReturnType<typeof vi.fn>) => mock.mock.lastCall?.[0]?.appearance?.variables?.colorPrimary
    const mountedAppearance = (mock: ReturnType<typeof vi.fn>) => mock.mock.lastCall?.[1]?.appearance

    it('shows every Clerk panel and form in the theme chosen now, not the one Clerk loaded with', () => {
        const { service, clerk, theme } = setup()
        const element = document.createElement('div')

        theme.palette.set('felt')
        service.openUserProfile()
        service.mountSignIn(element)
        service.mountSignUp(element)

        expect(primaryOf(clerk.openUserProfile)).toBe(THEME_COLORS.felt.primary)
        expect(mountedAppearance(clerk.mountSignIn)?.variables?.colorPrimary).toBe(THEME_COLORS.felt.primary)
        expect(mountedAppearance(clerk.mountSignUp)?.variables?.colorPrimary).toBe(THEME_COLORS.felt.primary)

        theme.palette.set('harbor')
        service.openUserProfile()

        expect(primaryOf(clerk.openUserProfile)).toBe(THEME_COLORS.harbor.primary)
    })

    // Retest polish after #324: white text on the primary button in dark mode too, and no card inside the page's card.
    it('mounts the forms with white text on the primary, and without a card of their own', () => {
        const { service, clerk } = setup()

        service.mountSignIn(document.createElement('div'))

        const appearance = mountedAppearance(clerk.mountSignIn)
        expect(appearance?.variables?.colorPrimaryForeground).toBe('#ffffff')
        expect(appearance?.elements?.card).toEqual(expect.objectContaining({ padding: '0 0 1.5rem', background: 'transparent' }))
        expect(appearance?.elements?.headerTitle).toEqual({ display: 'none' })
    })

    it('sends sign-in and sign-up links, and the redirect after signing in, to the app under its language prefix', () => {
        const { service, clerk } = setup()

        service.mountSignIn(document.createElement('div'))

        const options = clerk.mountSignIn.mock.lastCall?.[1]
        expect(options?.signUpUrl).toBe(new URL('register', document.baseURI).href)
        expect(options?.fallbackRedirectUrl).toBe(new URL('dashboard', document.baseURI).href)
    })
})

describe('afterFirstPagePaint', () => {
    afterEach(() => {
        vi.useRealTimers()
        vi.unstubAllGlobals()
    })

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

    it('waits for the browser to report the first contentful paint, when it can', async () => {
        let report!: (names: string[]) => void
        class FakePerformanceObserver {
            public static readonly supportedEntryTypes = ['paint']
            constructor(callback: (entries: { getEntriesByName: (name: string) => unknown[] }) => void) {
                report = (names) => callback({ getEntriesByName: (name) => names.filter((entry) => entry === name) })
            }
            public observe(): void {}
            public disconnect(): void {}
        }
        vi.stubGlobal('PerformanceObserver', FakePerformanceObserver)
        vi.useFakeTimers()
        const events = new Subject<unknown>()
        let done = false
        void afterFirstPagePaint({ events } as unknown as Router).then(() => (done = true))

        events.next(new NavigationEnd(1, '/', '/'))
        await vi.advanceTimersByTimeAsync(100)
        report(['first-paint'])
        await vi.advanceTimersByTimeAsync(100)
        expect(done).toBe(false)

        report(['first-contentful-paint'])
        await vi.runAllTimersAsync()
        expect(done).toBe(true)
    })
})

describe('ClerkService.forgetSession', () => {
    it('clears the signed-in user Board Vault reads, but keeps Clerk loaded for the next sign-in', () => {
        const service = TestBed.inject(ClerkService)
        const clerk = { mountSignIn: vi.fn() }
        ;(service as unknown as { clerk: typeof clerk }).clerk = clerk
        service.isSignedIn.set(true)
        service.userId.set('user_7')
        service.username.set('ana')
        service.primaryEmail.set('ana@example.com')

        service.forgetSession()

        expect([service.isSignedIn(), service.userId(), service.username(), service.primaryEmail()]).toEqual([false, null, null, null])
        service.mountSignIn(document.createElement('div'))
        expect(clerk.mountSignIn).toHaveBeenCalled()
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
