import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { Router } from '@angular/router'
import { Subject, of, throwError } from 'rxjs'
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
        const profile = new Subject<{ id: number }>()
        const navigate = jasmine.createSpy('navigate').and.resolveTo(true)
        const signOut = jasmine.createSpy('signOut').and.resolveTo()
        const api = {
            clerkAuthStatus: jasmine
                .createSpy('clerkAuthStatus')
                .and.returnValue(of({ isValid: true, userId: 7, isAdmin: false, clerkUserId: 'clerk_7' })),
            getUserById: jasmine.createSpy('getUserById').and.returnValue(profile.asObservable()),
        }
        const dataService = { currentUser: signal<null | { id: number }>(null) }

        TestBed.configureTestingModule({
            providers: [
                LoginService,
                { provide: Api, useValue: api },
                { provide: Router, useValue: { navigate } },
                { provide: LogService, useValue: { log: jasmine.createSpy('log'), error: jasmine.createSpy('error') } },
                { provide: ToastService, useValue: { error: jasmine.createSpy('error'), success: jasmine.createSpy('success') } },
                {
                    provide: LoadingService,
                    useValue: {
                        start: jasmine.createSpy('start'),
                        finish: jasmine.createSpy('finish'),
                        setAllLoadingTo: jasmine.createSpy('setAllLoadingTo'),
                    },
                },
                {
                    provide: LocalStorageService,
                    useValue: {
                        getItem: jasmine.createSpy('getItem'),
                        setItem: jasmine.createSpy('setItem'),
                        removeItem: jasmine.createSpy('removeItem'),
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
        expect(service.isAuthenticated()).toBeFalse()
        expect(service.clerkAuthHandoffState()).toBe('linking')
        expect(dataService.currentUser()).toBeNull()

        profile.next({ id: 7 })

        expect(results).toEqual([true])
        expect(service.isAuthenticated()).toBeTrue()
        expect(service.clerkAuthHandoffState()).toBe('ready')
        expect(dataService.currentUser()).toEqual({ id: 7 })

        await service.logOut()

        expect(signOut).toHaveBeenCalled()
        expect(service.isAuthenticated()).toBeFalse()
        expect(service.clerkAuthHandoffState()).toBe('idle')
        expect(navigate).toHaveBeenCalledWith(['/'])
    })

    it('uses group-specific recovery copy for a failed invitation handoff', () => {
        const api = {
            clerkAuthStatus: jasmine.createSpy('clerkAuthStatus').and.returnValue(throwError(() => new Error('group unavailable'))),
            getUserById: jasmine.createSpy('getUserById'),
        }
        const dataService = { currentUser: signal<null | { id: number }>(null) }

        TestBed.configureTestingModule({
            providers: [
                LoginService,
                { provide: Api, useValue: api },
                { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
                { provide: LogService, useValue: { log: jasmine.createSpy('log'), error: jasmine.createSpy('error') } },
                { provide: ToastService, useValue: { error: jasmine.createSpy('error'), success: jasmine.createSpy('success') } },
                {
                    provide: LoadingService,
                    useValue: {
                        start: jasmine.createSpy('start'),
                        finish: jasmine.createSpy('finish'),
                        setAllLoadingTo: jasmine.createSpy('setAllLoadingTo'),
                    },
                },
                {
                    provide: LocalStorageService,
                    useValue: {
                        getItem: jasmine.createSpy('getItem'),
                        setItem: jasmine.createSpy('setItem'),
                        removeItem: jasmine.createSpy('removeItem'),
                    },
                },
                {
                    provide: ClerkService,
                    useValue: {
                        isSignedIn: signal(true),
                        userId: signal<string | null>(null),
                        isInvitationFlow: signal(true),
                        signOut: jasmine.createSpy('signOut').and.resolveTo(),
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
