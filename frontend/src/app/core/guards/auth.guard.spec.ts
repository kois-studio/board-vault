import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router'
import { firstValueFrom, Observable, of, Subject } from 'rxjs'

import { ClerkService } from '../services/clerk.service'
import { LoginService } from '../services/login.service'
import { AuthOnlyGuard, SHOWS_AUTH_HANDOFF } from './auth.guard'

describe('AuthOnlyGuard', () => {
    function run(options: {
        authenticated: boolean
        signedIn: boolean
        handoffLayout: boolean
        verification: Observable<boolean>
        clerkLoaded?: Promise<void>
    }) {
        const loginService = {
            isAuthenticated: signal(options.authenticated),
            verifySession: vi.fn().mockName('verifySession').mockReturnValue(options.verification),
        }
        TestBed.configureTestingModule({
            providers: [
                { provide: LoginService, useValue: loginService },
                {
                    provide: ClerkService,
                    useValue: { isSignedIn: signal(options.signedIn), whenLoaded: () => options.clerkLoaded ?? Promise.resolve() },
                },
            ],
        })
        const route = { pathFromRoot: [{ data: options.handoffLayout ? { [SHOWS_AUTH_HANDOFF]: true } : {} }, { data: {} }] }
        const result = TestBed.runInInjectionContext(() =>
            AuthOnlyGuard(route as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
        ) as Observable<boolean>

        return { loginService, result }
    }

    it('allows an authenticated user without verifying again', async () => {
        const { loginService, result } = run({ authenticated: true, signedIn: true, handoffLayout: true, verification: of(true) })

        expect(await firstValueFrom(result)).toBe(true)
        expect(loginService.verifySession).not.toHaveBeenCalled()
    })

    it('lets a signed-in user reach a handoff layout while verification is pending', async () => {
        const pending = new Subject<boolean>()
        const { loginService, result } = run({ authenticated: false, signedIn: true, handoffLayout: true, verification: pending })

        expect(await firstValueFrom(result)).toBe(true)
        expect(loginService.verifySession).toHaveBeenCalled()
    })

    it('waits for verification on layouts without a handoff screen', async () => {
        const { result } = run({ authenticated: false, signedIn: true, handoffLayout: false, verification: of(false) })

        expect(await firstValueFrom(result)).toBe(false)
    })

    it('waits for verification when there is no Clerk session', async () => {
        const { result } = run({ authenticated: false, signedIn: false, handoffLayout: true, verification: of(false) })

        expect(await firstValueFrom(result)).toBe(false)
    })

    it('decides nothing until Clerk has loaded', async () => {
        let finishLoading = () => {}
        const clerkLoaded = new Promise<void>((resolve) => {
            finishLoading = resolve
        })
        const { loginService, result } = run({
            authenticated: false,
            signedIn: false,
            handoffLayout: false,
            verification: of(false),
            clerkLoaded,
        })
        const decision = firstValueFrom(result)

        await Promise.resolve()
        expect(loginService.verifySession).not.toHaveBeenCalled()

        finishLoading()
        expect(await decision).toBe(false)
        expect(loginService.verifySession).toHaveBeenCalled()
    })
})
