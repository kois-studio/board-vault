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
    const appearanceOf = (mock: ReturnType<typeof vi.fn>) => mock.mock.lastCall?.[0]?.appearance

    it('opens every Clerk dialog in the theme chosen now, not the one Clerk loaded with', () => {
        const { service, clerk, theme } = setup()

        theme.palette.set('felt')
        service.openUserProfile()
        service.openSignIn()
        service.openSignUp()

        expect(appearanceOf(clerk.openUserProfile)?.variables?.colorPrimary).toBe(THEME_COLORS.felt.primary)
        expect(appearanceOf(clerk.openSignIn)?.variables?.colorPrimary).toBe(THEME_COLORS.felt.primary)
        expect(appearanceOf(clerk.openSignUp)?.variables?.colorPrimary).toBe(THEME_COLORS.felt.primary)
        expect(clerk.openSignIn.mock.lastCall?.[0]?.withSignUp).toBe(true)

        theme.palette.set('harbor')
        service.openUserProfile()

        expect(appearanceOf(clerk.openUserProfile)?.variables?.colorPrimary).toBe(THEME_COLORS.harbor.primary)
    })

    it('writes white on the primary button, in light and dark mode', () => {
        const { service, clerk } = setup()

        service.openSignIn()

        expect(appearanceOf(clerk.openSignIn)?.variables?.colorPrimaryForeground).toBe('#ffffff')
    })

    it('opens no sign-up dialog while sign-up is paused', () => {
        const { service, clerk } = setup()
        service.isSelfRegistrationEnabled.set(false)

        service.openSignUp()

        expect(clerk.openSignUp).not.toHaveBeenCalled()
    })
})

// #343: Clerk's redirect after signing in is a navigation in the app, never a page load that starts over.
describe('ClerkService navigation for Clerk', () => {
    const navigate = (to: string, replace = false) =>
        (TestBed.inject(ClerkService) as unknown as { navigateInApp(to: string, replace: boolean): Promise<unknown> }).navigateInApp(
            to,
            replace,
        )

    it('opens a page of the app with the router, without the language prefix, keeping query and fragment', async () => {
        const router = TestBed.inject(Router)
        const navigateByUrl = vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true)

        await navigate(new URL('dashboard?x=1#top', document.baseURI).href)
        await navigate(new URL('groups/7', document.baseURI).href, true)

        expect(navigateByUrl).toHaveBeenNthCalledWith(1, '/dashboard?x=1#top', { replaceUrl: false })
        expect(navigateByUrl).toHaveBeenNthCalledWith(2, '/groups/7', { replaceUrl: true })
    })

    it('loads another site as a page', async () => {
        const navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl')
        const assign = vi.fn()
        vi.stubGlobal('location', { ...location, assign, replace: vi.fn() })

        try {
            await navigate('https://accounts.example.com/sign-in')
        } finally {
            vi.unstubAllGlobals()
        }

        expect(assign).toHaveBeenCalledWith('https://accounts.example.com/sign-in')
        expect(navigateByUrl).not.toHaveBeenCalled()
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
