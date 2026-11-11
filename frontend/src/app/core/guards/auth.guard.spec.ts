import { signal } from '@angular/core'
import { TestBed } from '@angular/core/testing'
import { ActivatedRouteSnapshot, Route, Router, RouterStateSnapshot, UrlTree } from '@angular/router'
import { firstValueFrom, Observable, of, Subject } from 'rxjs'

import { routes } from '../../app.routes'
import { LayoutBasicComponent } from '../../layout/layout-basic/layout-basic.component'

import { AccountPendingService, FOCUSED_LAYOUT } from '../services/account-pending.service'
import { ClerkService } from '../services/clerk.service'
import { LoginService } from '../services/login.service'
import { AuthOnlyGuard, SHOWS_AUTH_HANDOFF } from './auth.guard'

describe('AuthOnlyGuard', () => {
    const landing = (commands: Array<string>) => ({ landing: commands }) as unknown as UrlTree
    function run(options: {
        authenticated: boolean
        signedIn: boolean
        handoffLayout: boolean
        verification: Observable<boolean>
        clerkLoaded?: Promise<void>
        firstNavigation?: boolean
    }) {
        const loginService = {
            isAuthenticated: signal(options.authenticated),
            verifySession: vi.fn().mockName('verifySession').mockReturnValue(options.verification),
        }
        const accountPending = { showBootFrameWhileWaiting: vi.fn() }
        TestBed.configureTestingModule({
            providers: [
                { provide: LoginService, useValue: loginService },
                { provide: AccountPendingService, useValue: accountPending },
                {
                    provide: ClerkService,
                    useValue: { isSignedIn: signal(options.signedIn), whenLoaded: () => options.clerkLoaded ?? Promise.resolve() },
                },
                {
                    provide: Router,
                    useValue: { navigated: !options.firstNavigation, createUrlTree: (commands: Array<string>) => landing(commands) },
                },
            ],
        })
        const route = { pathFromRoot: [{ data: options.handoffLayout ? { [SHOWS_AUTH_HANDOFF]: true } : {} }, { data: {} }] }
        const result = TestBed.runInInjectionContext(() =>
            AuthOnlyGuard(route as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
        ) as Observable<boolean | UrlTree>

        return { loginService, accountPending, route, result }
    }

    it('allows an authenticated user without verifying again', async () => {
        const { loginService, result } = run({ authenticated: true, signedIn: true, handoffLayout: true, verification: of(true) })

        expect(await firstValueFrom(result)).toBe(true)
        expect(loginService.verifySession).not.toHaveBeenCalled()
    })

    it('shows the app frame while it waits, instead of a blank page (#259)', () => {
        const waiting = run({
            authenticated: false,
            signedIn: false,
            handoffLayout: true,
            verification: of(true),
            clerkLoaded: new Promise(() => {}),
        })
        expect(waiting.accountPending.showBootFrameWhileWaiting).toHaveBeenCalledWith(waiting.route)

        TestBed.resetTestingModule()
        const known = run({ authenticated: true, signedIn: true, handoffLayout: true, verification: of(true) })
        expect(known.accountPending.showBootFrameWhileWaiting).not.toHaveBeenCalled()
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

    it('opens the landing page instead of refusing the very first navigation, which would leave a blank page', async () => {
        const { result } = run({
            authenticated: false,
            signedIn: false,
            handoffLayout: true,
            verification: of(false),
            firstNavigation: true,
        })

        expect(await firstValueFrom(result)).toEqual(landing(['/']))
    })

    it('opens the page once verification succeeds on the very first navigation', async () => {
        const { result } = run({
            authenticated: false,
            signedIn: true,
            handoffLayout: false,
            verification: of(true),
            firstNavigation: true,
        })

        expect(await firstValueFrom(result)).toBe(true)
    })
})

describe('Pages behind AuthOnlyGuard', () => {
    /** Every route with AuthOnlyGuard, with the routes above it, from the real route table. */
    function guardedRoutes(list: Array<Route>, parents: Array<Route> = []): Array<Array<Route>> {
        return list.flatMap((route) => [
            ...(route.canActivate?.includes(AuthOnlyGuard) ? [[...parents, route]] : []),
            ...guardedRoutes(route.children ?? [], [...parents, route]),
        ])
    }
    const showsHandoff = (path: Array<Route>) => path.some((route) => route.data?.[SHOWS_AUTH_HANDOFF] === true)

    it('all sit in a layout that shows the handoff screen, so none opens blank while the account is resolved (#239)', () => {
        const guarded = guardedRoutes(routes)
        const withoutHandoff = guarded.filter((path) => !showsHandoff(path)).map((path) => path.at(-1)?.path)

        expect(guarded.length).toBeGreaterThan(20)
        expect(withoutHandoff).toEqual([])
    })

    it('include the focused pages in the basic layout', () => {
        const focused = routes.find((route) => route.component === LayoutBasicComponent)

        expect(focused?.data?.[SHOWS_AUTH_HANDOFF]).toBe(true)
        // Its boot frame is the skeleton alone, without the app's header (#259).
        expect(focused?.data?.[FOCUSED_LAYOUT]).toBe(true)
        expect(routes.filter((route) => route.component !== LayoutBasicComponent).some((route) => route.data?.[FOCUSED_LAYOUT])).toBe(false)
        expect(focused?.children?.map((route) => route.path)).toEqual(
            expect.arrayContaining([
                'create-group',
                'groups/:groupId/sessions/new',
                'groups/:groupId/edit',
                'groups/:groupId/people/:personId/claim',
                'collection/propose-game',
            ]),
        )
    })
})
