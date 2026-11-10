import { HttpContext, HttpErrorResponse } from '@angular/common/http'
import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { LOADING_KEYS } from '../enums/loading-keys-enum'
import { RETRY_READ } from '../interceptors/resilience.interceptor'
import { ApiUnavailableError } from '../utils/apiUnavailable'
import { ClerkService } from './clerk.service'
import { DataService } from './data.service'
import { LoadingService } from './loading.service'
import { LocalStorageService } from './local-storage.service'
import { LogService } from './log.service'
import { LoginService } from './login.service'

describe('LoginService account readiness', () => {
    it('does not activate the protected route until the local account is loaded', async () => {
        const profile = new Subject<{
            id: number
        }>()
        const navigate = vi.fn().mockName('navigate').mockResolvedValue(true)
        const signOut = vi.fn().mockName('signOut').mockResolvedValue(undefined)
        const api = {
            clerkAuthStatus: vi
                .fn()
                .mockName('clerkAuthStatus')
                .mockReturnValue(of({ isValid: true, userId: 7, isAdmin: false, clerkUserId: 'clerk_7' })),
            getUserById: vi.fn().mockName('getUserById').mockReturnValue(profile.asObservable()),
        }
        const dataService = {
            currentUser: signal<null | {
                id: number
            }>(null),
        }

        TestBed.configureTestingModule({
            providers: [
                LoginService,
                { provide: Api, useValue: api },
                { provide: Router, useValue: { navigate } },
                { provide: LogService, useValue: { log: vi.fn().mockName('log'), error: vi.fn().mockName('error') } },
                { provide: ToastService, useValue: { error: vi.fn().mockName('error'), success: vi.fn().mockName('success') } },
                {
                    provide: LoadingService,
                    useValue: {
                        start: vi.fn().mockName('start'),
                        finish: vi.fn().mockName('finish'),
                        setAllLoadingTo: vi.fn().mockName('setAllLoadingTo'),
                    },
                },
                {
                    provide: LocalStorageService,
                    useValue: {
                        getItem: vi.fn().mockName('getItem'),
                        setItem: vi.fn().mockName('setItem'),
                        removeItem: vi.fn().mockName('removeItem'),
                    },
                },
                {
                    provide: ClerkService,
                    useValue: { isSignedIn: signal(true), userId: signal<string | null>(null), signOut },
                },
                { provide: DataService, useValue: dataService },
            ],
        })

        const service = TestBed.inject(LoginService)
        const results: Array<boolean> = []
        const firstVerification = service.verifyClerkSession()
        const secondVerification = service.verifyClerkSession()

        expect(secondVerification).toBe(firstVerification)
        firstVerification.subscribe((isReady) => results.push(isReady))

        expect(results).toEqual([])
        expect(service.isAuthenticated()).toBe(false)
        expect(service.clerkAuthHandoffState()).toBe('linking')
        expect(dataService.currentUser()).toBeNull()

        profile.next({ id: 7 })

        expect(results).toEqual([true])
        expect(service.isAuthenticated()).toBe(true)
        expect(service.clerkAuthHandoffState()).toBe('ready')
        expect(dataService.currentUser()).toEqual({ id: 7 })

        await service.logOut()

        expect(signOut).toHaveBeenCalled()
        expect(service.isAuthenticated()).toBe(false)
        expect(service.clerkAuthHandoffState()).toBe('idle')
        expect(navigate).toHaveBeenCalledWith(['/'])
    })
})

describe('LoginService after the account is deleted', () => {
    const setup = (signOut: () => Promise<void>) => {
        const clerk = {
            isSignedIn: signal(true),
            userId: signal<string | null>('clerk_7'),
            signOut: vi.fn(signOut),
            forgetSession: vi.fn(() => {
                clerk.isSignedIn.set(false)
                clerk.userId.set(null)
            }),
        }
        const api = { clerkAuthStatus: vi.fn(() => of({ isValid: false })), getUserById: vi.fn() }
        const navigate = vi.fn().mockResolvedValue(true)
        const toast = { error: vi.fn(), success: vi.fn() }

        TestBed.configureTestingModule({
            providers: [
                LoginService,
                { provide: Api, useValue: api },
                { provide: Router, useValue: { navigate, url: '/settings/account' } },
                { provide: LogService, useValue: { log: vi.fn(), error: vi.fn() } },
                { provide: ToastService, useValue: toast },
                { provide: LoadingService, useValue: { start: vi.fn(), finish: vi.fn(), setAllLoadingTo: vi.fn() } },
                { provide: ClerkService, useValue: clerk },
                { provide: DataService, useValue: { currentUser: signal<{ id: number } | null>({ id: 7 }) } },
            ],
        })
        const service = TestBed.inject(LoginService)
        service.isAuthenticated.set(true)
        TestBed.tick()
        return { service, clerk, api, navigate, toast }
    }

    it('signs out for good even when Clerk cannot sign out a user it already deleted', async () => {
        const { service, clerk, api, navigate, toast } = setup(() => Promise.reject(new Error('user not found')))

        await service.leaveAfterAccountDeletion()
        TestBed.tick()

        expect(clerk.forgetSession).toHaveBeenCalled()
        expect(clerk.userId()).toBeNull()
        expect(service.isAuthenticated()).toBe(false)
        // Nothing asks the API about the deleted account, so no "session expired" follows.
        expect(api.clerkAuthStatus).not.toHaveBeenCalled()
        expect(navigate).toHaveBeenCalledWith(['/'])
        expect(toast.success).toHaveBeenCalledWith('Your account was deleted.')
        expect(toast.error).not.toHaveBeenCalled()
    })

    it('forgets the session too when Clerk signs out without reporting it', async () => {
        const { service, clerk, api } = setup(() => Promise.resolve())

        await service.leaveAfterAccountDeletion()
        TestBed.tick()

        expect(clerk.userId()).toBeNull()
        expect(api.clerkAuthStatus).not.toHaveBeenCalled()
    })
})

describe('LoginService when Board Vault cannot be reached (#238)', () => {
    const status = (code: number) => throwError(() => new HttpErrorResponse({ status: code, url: '/auth/clerk/status' }))
    /** A hung request, as resilienceInterceptor ends it (#240). */
    const timedOut = () => throwError(() => new ApiUnavailableError({ kind: 'timeout', outcomeUnknown: false, url: '/auth/clerk/status' }))
    const linked = () => of({ isValid: true as const, userId: 7, isAdmin: false, clerkUserId: 'clerk_7' })
    let visibility: DocumentVisibilityState

    const setup = (url = '/groups/3') => {
        const api = { clerkAuthStatus: vi.fn(), getUserById: vi.fn(() => of({ id: 7 })) }
        const navigate = vi.fn().mockResolvedValue(true)
        const navigation = signal<{ finalUrl?: { toString(): string }; extractedUrl?: { toString(): string } } | null>(null)
        const router = { navigate, navigateByUrl: vi.fn().mockResolvedValue(true), url, currentNavigation: navigation }
        const toast = { error: vi.fn(), success: vi.fn() }
        const loading = { start: vi.fn(), finish: vi.fn(), setAllLoadingTo: vi.fn() }
        const dataService = { currentUser: signal<{ id: number } | null>(null) }

        TestBed.configureTestingModule({
            providers: [
                LoginService,
                { provide: Api, useValue: api },
                { provide: Router, useValue: router },
                { provide: LogService, useValue: { log: vi.fn(), error: vi.fn() } },
                { provide: ToastService, useValue: toast },
                { provide: LoadingService, useValue: loading },
                {
                    provide: ClerkService,
                    useValue: {
                        isSignedIn: signal(true),
                        userId: signal<string | null>(null),
                        signOut: vi.fn(),
                    },
                },
                { provide: DataService, useValue: dataService },
            ],
        })
        return { service: TestBed.inject(LoginService), api, navigate, router, navigation, toast, loading, dataService }
    }

    beforeEach(() => {
        vi.useFakeTimers()
        visibility = 'visible'
        vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibility)
    })
    afterEach(() => {
        vi.useRealTimers()
        vi.restoreAllMocks()
    })

    const expectNotSignedOut = ({ service, navigate, toast, loading }: ReturnType<typeof setup>) => {
        expect(service.clerkAuthHandoffState()).toBe('unavailable')
        expect(service.clerkAuthHandoffError()).toBeNull()
        expect(loading.setAllLoadingTo).not.toHaveBeenCalled()
        expect(navigate).not.toHaveBeenCalled()
        expect(toast.error).not.toHaveBeenCalled()
    }

    it('shows the can’t-reach state for a 5xx, a refused connection, or a timeout on the session check', () => {
        for (const failure of [status(503), status(500), status(0), timedOut()]) {
            TestBed.resetTestingModule()
            const context = setup()
            context.api.clerkAuthStatus.mockReturnValue(failure)
            const results: Array<boolean> = []

            context.service.verifyClerkSession().subscribe((ready) => results.push(ready))

            expect(results).toEqual([false])
            expectNotSignedOut(context)
        }
    })

    it('leaves retrying its requests to its own schedule, not the interceptor’s (#240)', () => {
        const context = setup()
        context.api.clerkAuthStatus.mockReturnValue(linked())

        context.service.verifyClerkSession().subscribe()

        const [, requestContext] = context.api.getUserById.mock.calls[0] as unknown as [number, HttpContext]
        expect(requestContext.get(RETRY_READ)).toBe(false)
    })

    it('keeps the session and the account id when loading the account fails the same way', () => {
        for (const failure of [status(503), status(0), timedOut()]) {
            TestBed.resetTestingModule()
            const context = setup()
            context.api.clerkAuthStatus.mockReturnValue(linked())
            context.api.getUserById.mockReturnValue(failure as never)

            context.service.verifyClerkSession().subscribe()

            expectNotSignedOut(context)
            expect(context.service.currentUserId()).toBe(7)
            expect(context.service.isAuthenticated()).toBe(false)
        }
    })

    it('tries again after 2, 5, 10, then every 30 seconds, and stays on the page that was asked for', () => {
        const context = setup('/groups/3')
        context.api.clerkAuthStatus.mockReturnValue(status(503))
        context.service.verifyClerkSession().subscribe()
        const calls = () => context.api.clerkAuthStatus.mock.calls.length

        for (const [wait, total] of [
            [2_000, 2],
            [5_000, 3],
            [10_000, 4],
            [30_000, 5],
            [30_000, 6],
        ] as const) {
            vi.advanceTimersByTime(wait - 1)
            expect(calls()).toBe(total - 1)
            vi.advanceTimersByTime(1)
            expect(calls()).toBe(total)
        }
        expect(context.service.clerkAuthHandoffState()).toBe('unavailable')

        context.api.clerkAuthStatus.mockReturnValue(linked())
        vi.advanceTimersByTime(30_000)

        expect(context.service.isAuthenticated()).toBe(true)
        expect(context.service.clerkAuthHandoffState()).toBe('ready')
        expect(context.dataService.currentUser()).toEqual({ id: 7 })
        // The page that was asked for renders by itself once the handoff ends; nothing navigates away from it.
        expect(context.navigate).not.toHaveBeenCalled()
        vi.advanceTimersByTime(60_000)
        expect(calls()).toBe(7)
    })

    it('opens Home after recovering on the sign-in pages, as a normal sign-in does', () => {
        const context = setup('/login')
        context.api.clerkAuthStatus.mockReturnValueOnce(status(503)).mockReturnValue(linked())

        context.service.verifyClerkSession().subscribe()
        vi.advanceTimersByTime(2_000)

        expect(context.navigate).toHaveBeenCalledWith(['/dashboard'])
    })

    it('stays on the can’t-reach screen while it tries again, instead of flashing back to connecting', () => {
        const context = setup()
        const answer = new Subject<never>()
        context.api.clerkAuthStatus.mockReturnValueOnce(status(503)).mockReturnValue(answer)
        context.service.verifyClerkSession().subscribe()

        context.service.retryClerkSession()

        expect(context.service.clerkAuthHandoffState()).toBe('unavailable')
        expect(context.service.isReconnecting()).toBe(true)
        answer.error(new HttpErrorResponse({ status: 503 }))
        expect(context.service.isReconnecting()).toBe(false)
        expect(context.service.clerkAuthHandoffState()).toBe('unavailable')
    })

    it('replaces the waiting try with one made by hand, and keeps the waits growing', () => {
        const context = setup()
        context.api.clerkAuthStatus.mockReturnValue(status(503))
        context.service.verifyClerkSession().subscribe()

        vi.advanceTimersByTime(1_000)
        context.service.retryClerkSession()
        expect(context.api.clerkAuthStatus).toHaveBeenCalledTimes(2)

        // The 2 s try was cancelled; the next automatic one waits 5 s from the manual try.
        vi.advanceTimersByTime(4_999)
        expect(context.api.clerkAuthStatus).toHaveBeenCalledTimes(2)
        vi.advanceTimersByTime(1)
        expect(context.api.clerkAuthStatus).toHaveBeenCalledTimes(3)
    })

    it('waits while the tab is hidden, and tries as soon as it is shown or the browser is back online', () => {
        const context = setup()
        context.api.clerkAuthStatus.mockReturnValue(status(503))
        context.service.verifyClerkSession().subscribe()

        visibility = 'hidden'
        vi.advanceTimersByTime(60_000)
        expect(context.api.clerkAuthStatus).toHaveBeenCalledTimes(1)

        visibility = 'visible'
        document.dispatchEvent(new Event('visibilitychange'))
        expect(context.api.clerkAuthStatus).toHaveBeenCalledTimes(2)

        window.dispatchEvent(new Event('online'))
        expect(context.api.clerkAuthStatus).toHaveBeenCalledTimes(3)
    })

    it('stops trying once the person signs out', async () => {
        const context = setup()
        context.api.clerkAuthStatus.mockReturnValue(status(503))
        context.service.verifyClerkSession().subscribe()

        await context.service.logOut()
        vi.advanceTimersByTime(120_000)
        window.dispatchEvent(new Event('online'))

        expect(context.api.clerkAuthStatus).toHaveBeenCalledTimes(1)
    })

    it('keeps the linking error, and signs out, for a rejected session or an account that cannot be linked', () => {
        for (const code of [401, 409, 404]) {
            TestBed.resetTestingModule()
            const context = setup()
            context.api.clerkAuthStatus.mockReturnValue(status(code))

            context.service.verifyClerkSession().subscribe()
            vi.advanceTimersByTime(60_000)

            expect(context.service.clerkAuthHandoffState()).toBe('error')
            expect(context.service.clerkAuthHandoffError()).toContain('We could not finish connecting this sign-in')
            expect(context.loading.setAllLoadingTo).toHaveBeenCalled()
            expect(context.api.clerkAuthStatus).toHaveBeenCalledTimes(1)
        }
    })

    it('keeps today’s handling when the account itself is refused', () => {
        const context = setup()
        context.api.clerkAuthStatus.mockReturnValue(linked())
        context.api.getUserById.mockReturnValue(status(404) as never)

        context.service.verifyClerkSession().subscribe()

        expect(context.toast.error).toHaveBeenCalledWith('Failed to load essential user information. Please log in again.')
        expect(context.navigate).toHaveBeenCalledWith(['/'])
        expect(context.service.clerkAuthHandoffState()).toBe('error')
        expect(context.service.currentUserId()).toBeNull()
    })
    it('finishes the try even when every caller stops listening, so the screen never waits for nothing', () => {
        const context = setup()
        const answer = new Subject<never>()
        context.api.clerkAuthStatus.mockReturnValueOnce(answer).mockReturnValue(linked())

        // A guard's navigation replaced by another one: the router drops its subscription mid-request.
        context.service.verifyClerkSession().subscribe().unsubscribe()
        answer.error(new HttpErrorResponse({ status: 503 }))

        expect(context.service.clerkAuthHandoffState()).toBe('unavailable')
        vi.advanceTimersByTime(2_000)
        expect(context.service.isAuthenticated()).toBe(true)
    })

    it('recovers when loading the account failed, and does not leave it marked as loading', () => {
        const context = setup()
        context.api.clerkAuthStatus.mockReturnValue(linked())
        context.api.getUserById.mockReturnValueOnce(status(503) as never)

        context.service.verifyClerkSession().subscribe()
        expect(context.loading.finish).toHaveBeenCalledWith(LOADING_KEYS.USER_DATA)
        vi.advanceTimersByTime(2_000)

        expect(context.service.isAuthenticated()).toBe(true)
        expect(context.dataService.currentUser()).toEqual({ id: 7 })
    })

    it('starts the waits from 2 seconds again after a later outage', () => {
        const context = setup()
        context.api.clerkAuthStatus.mockReturnValueOnce(status(503)).mockReturnValueOnce(status(503)).mockReturnValue(linked())
        context.service.verifyClerkSession().subscribe()
        vi.advanceTimersByTime(2_000 + 5_000)
        expect(context.service.isAuthenticated()).toBe(true)

        // Signed out and in again while the API is down: the first wait is 2 s, not where the last outage stopped.
        context.service.isAuthenticated.set(false)
        context.api.clerkAuthStatus.mockReturnValue(status(503))
        context.service.verifyClerkSession().subscribe()
        const before = context.api.clerkAuthStatus.mock.calls.length
        vi.advanceTimersByTime(2_000)
        expect(context.api.clerkAuthStatus).toHaveBeenCalledTimes(before + 1)
    })

    describe('a page waiting for the account to be known (Administration)', () => {
        it('opens after a sign-in that went through at once', () => {
            const context = setup('/dashboard')
            context.api.clerkAuthStatus.mockReturnValue(linked())
            context.service.openOnceAccountIsKnown('/admin/games')
            context.service.verifyClerkSession().subscribe()

            expect(context.router.navigateByUrl).toHaveBeenCalledWith('/admin/games', { replaceUrl: true })
        })

        it('opens when the account is known before the router has worked out the page it is opening', () => {
            const context = setup('/')
            context.navigation.set({ extractedUrl: { toString: () => '/dashboard' } })
            context.api.clerkAuthStatus.mockReturnValue(linked())
            context.service.openOnceAccountIsKnown('/admin/games')
            context.service.verifyClerkSession().subscribe()

            expect(context.router.navigateByUrl).toHaveBeenCalledWith('/admin/games', { replaceUrl: true })
        })

        const outageThenAnswer = (url: string) => {
            const context = setup(url)
            context.api.clerkAuthStatus.mockReturnValueOnce(status(503)).mockReturnValue(linked())
            context.service.verifyClerkSession().subscribe()
            context.service.openOnceAccountIsKnown('/admin/games')
            return context
        }

        it('opens once Board Vault answers, from Home where the guard sent the person', () => {
            const context = outageThenAnswer('/dashboard')
            vi.advanceTimersByTime(2_000)

            expect(context.service.isAuthenticated()).toBe(true)
            expect(context.router.navigateByUrl).toHaveBeenCalledWith('/admin/games', { replaceUrl: true })
            expect(context.navigate).not.toHaveBeenCalled()
        })

        it('opens when Board Vault answers while the router is still opening Home', () => {
            const context = outageThenAnswer('/')
            context.navigation.set({ finalUrl: { toString: () => '/dashboard' } })
            vi.advanceTimersByTime(2_000)

            expect(context.router.navigateByUrl).toHaveBeenCalledWith('/admin/games', { replaceUrl: true })
        })

        it('does not pull the person back after they went to another page', () => {
            const context = outageThenAnswer('/dashboard')
            context.router.url = '/groups/3'
            vi.advanceTimersByTime(2_000)

            expect(context.service.isAuthenticated()).toBe(true)
            expect(context.router.navigateByUrl).not.toHaveBeenCalled()
        })

        it('opens it only once', () => {
            const context = outageThenAnswer('/dashboard')
            vi.advanceTimersByTime(2_000)
            context.service.isAuthenticated.set(false)
            context.service.verifyClerkSession().subscribe()

            expect(context.router.navigateByUrl).toHaveBeenCalledTimes(1)
        })

        it('forgets it when the person signs out', async () => {
            const context = outageThenAnswer('/dashboard')
            await context.service.logOut()
            context.service.verifyClerkSession().subscribe()

            expect(context.router.navigateByUrl).not.toHaveBeenCalled()
        })

        it('forgets it when the session turns out not to be usable', () => {
            const context = outageThenAnswer('/dashboard')
            context.api.clerkAuthStatus
                .mockReset()
                .mockReturnValueOnce(of({ isValid: false }))
                .mockReturnValue(linked())
            vi.advanceTimersByTime(2_000)
            context.service.verifyClerkSession().subscribe()

            expect(context.service.clerkAuthHandoffState()).toBe('ready')
            expect(context.router.navigateByUrl).not.toHaveBeenCalled()
        })
    })
})
