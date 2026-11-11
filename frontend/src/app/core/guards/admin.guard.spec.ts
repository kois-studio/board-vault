import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree } from '@angular/router'
import { firstValueFrom, isObservable, Observable, of } from 'rxjs'
import { ToastService } from '../../components/toast/toast.service'
import { AccountPendingService } from '../services/account-pending.service'
import { ClerkService } from '../services/clerk.service'
import { LogService } from '../services/log.service'
import { LoginService } from '../services/login.service'
import { AdminGuard } from './admin.guard'

describe('AdminGuard', () => {
    const home = { home: true } as unknown as UrlTree

    const run = (options: { authenticated?: boolean; admin?: boolean; signedIn: boolean; authenticatedOnceClerkLoads?: boolean }) => {
        const navigate = vi.fn().mockResolvedValue(true)
        const toast = { error: vi.fn(), info: vi.fn() }
        const isAuthenticated = signal(options.authenticated ?? false)
        const loginService = {
            isAuthenticated,
            isCurrentUserAdmin: signal(options.admin ?? false),
            verifySession: vi.fn(() => of(false)),
            openOnceAccountIsKnown: vi.fn(),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: LoginService, useValue: loginService },
                { provide: AccountPendingService, useValue: { showBootFrameWhileWaiting: vi.fn() } },
                {
                    provide: ClerkService,
                    useValue: {
                        isSignedIn: signal(options.signedIn),
                        whenLoaded: async () => {
                            if (options.authenticatedOnceClerkLoads) isAuthenticated.set(true)
                        },
                    },
                },
                { provide: Router, useValue: { navigate, createUrlTree: () => home } },
                { provide: ToastService, useValue: toast },
                { provide: LogService, useValue: { log: vi.fn(), warn: vi.fn() } },
            ],
        })
        const result = TestBed.runInInjectionContext(() =>
            AdminGuard({} as ActivatedRouteSnapshot, { url: '/admin/games' } as RouterStateSnapshot),
        ) as Observable<boolean | UrlTree> | boolean
        const decision = () => (isObservable(result) ? firstValueFrom(result) : Promise.resolve(result))
        return { decision, navigate, toast, loginService }
    }

    it('lets an admin in', async () => {
        const { decision, toast } = run({ authenticated: true, admin: true, signedIn: true })

        expect(await decision()).toBe(true)
        expect(toast.error).not.toHaveBeenCalled()
    })

    it('turns away someone who is not an operator', async () => {
        const { decision, toast, navigate } = run({ authenticated: true, admin: false, signedIn: true })

        expect(await decision()).toBe(false)
        expect(toast.error).toHaveBeenCalled()
        expect(navigate).toHaveBeenCalledWith(['/dashboard'])
    })

    it('opens Home, which shows the handoff screen, instead of a blank page while the account is resolved (#239)', async () => {
        const { decision, toast, navigate, loginService } = run({ signedIn: true })

        expect(await decision()).toBe(home)
        expect(loginService.openOnceAccountIsKnown).toHaveBeenCalledWith('/admin/games')
        // It does not wait for Board Vault, which may be slow or down, and does not ask anyone to sign in.
        expect(loginService.verifySession).not.toHaveBeenCalled()
        expect(toast.info).not.toHaveBeenCalled()
        expect(toast.error).not.toHaveBeenCalled()
        expect(navigate).not.toHaveBeenCalled()
    })

    it('decides at once when the account became known while Clerk loaded', async () => {
        const { decision, loginService } = run({ admin: true, signedIn: true, authenticatedOnceClerkLoads: true })

        expect(await decision()).toBe(true)
        expect(loginService.openOnceAccountIsKnown).not.toHaveBeenCalled()
    })

    it('asks someone who is not signed in to sign in', async () => {
        const { decision, toast, navigate, loginService } = run({ signedIn: false })

        expect(await decision()).toBe(false)
        expect(toast.info).toHaveBeenCalledWith('Please log in with admin credentials to access this area.')
        expect(navigate).toHaveBeenCalledWith(['/login'], { queryParams: { returnUrl: '/admin/games' } })
        expect(loginService.openOnceAccountIsKnown).not.toHaveBeenCalled()
    })
})
