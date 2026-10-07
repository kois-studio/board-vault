import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { of, Subject, throwError } from 'rxjs'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
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
                    useValue: { isSignedIn: signal(true), userId: signal<string | null>(null), isInvitationFlow: signal(false), signOut },
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

    it('uses group-specific recovery copy for a failed invitation handoff', () => {
        const api = {
            clerkAuthStatus: vi
                .fn()
                .mockName('clerkAuthStatus')
                .mockReturnValue(throwError(() => new Error('group unavailable'))),
            getUserById: vi.fn().mockName('getUserById'),
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
                { provide: Router, useValue: { navigate: vi.fn().mockName('navigate') } },
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
                    useValue: {
                        isSignedIn: signal(true),
                        userId: signal<string | null>(null),
                        isInvitationFlow: signal(true),
                        signOut: vi.fn().mockName('signOut').mockResolvedValue(undefined),
                    },
                },
                { provide: DataService, useValue: dataService },
            ],
        })

        const service = TestBed.inject(LoginService)
        service.verifyClerkSession().subscribe()

        expect(service.clerkAuthHandoffError()).toContain('joining this group')
        expect(service.clerkAuthHandoffError()).toContain('fresh invitation')
    })
})

describe('LoginService after the account is deleted', () => {
    const setup = (signOut: () => Promise<void>) => {
        const clerk = {
            isSignedIn: signal(true),
            userId: signal<string | null>('clerk_7'),
            isInvitationFlow: signal(false),
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
