// auth.guard.ts
import { inject } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivateFn, Router, UrlTree } from '@angular/router'
import { from, map, Observable, of, switchMap } from 'rxjs'

import { AccountPendingService } from '../services/account-pending.service'
import { ClerkService } from '../services/clerk.service'
import { LoginService } from '../services/login.service'

/** Route data flag for layouts that render the auth handoff screen. */
export const SHOWS_AUTH_HANDOFF = 'showsAuthHandoff'

/**
 * Prevents access to a route if the user is not authenticated.
 *
 * A signed-in Clerk user whose Board Vault account is still being resolved is
 * let through on routes whose layout renders the handoff screen: the layout
 * shows "Connecting…" (or retry and sign-out controls on failure) instead of
 * a blank page while /auth/clerk/status answers. Both layouts render it, so
 * every page behind this guard does (#239). Other routes wait for the
 * verification.
 *
 * Before Clerk has loaded nobody knows yet whether someone is signed in, so the
 * first page waits here; `AppComponent` shows the app's frame and a page
 * skeleton meanwhile instead of a blank page (#259).
 */
export const AuthOnlyGuard: CanActivateFn = (route: ActivatedRouteSnapshot): Observable<boolean | UrlTree> => {
    const loginService = inject(LoginService)
    const clerkService = inject(ClerkService)
    const router = inject(Router)

    if (loginService.isAuthenticated()) {
        return of(true)
    }

    inject(AccountPendingService).showBootFrameWhileWaiting(route)
    return from(clerkService.whenLoaded()).pipe(switchMap(() => afterClerkLoaded(route, loginService, clerkService, router)))
}

function afterClerkLoaded(
    route: ActivatedRouteSnapshot,
    loginService: LoginService,
    clerkService: ClerkService,
    router: Router,
): Observable<boolean | UrlTree> {
    const layoutShowsHandoff = route.pathFromRoot.some((snapshot) => snapshot.data?.[SHOWS_AUTH_HANDOFF] === true)
    if (clerkService.isSignedIn() && layoutShowsHandoff) {
        loginService.verifySession().subscribe()
        return of(true)
    }

    // LoginService usually navigates to '/' itself when there is no session. If it did not, refusing the very
    // first navigation would leave nothing on screen, so open the landing page instead; later navigations just
    // stay on the page that is already showing.
    return loginService.verifySession().pipe(map((verified) => verified || (router.navigated ? false : router.createUrlTree(['/']))))
}
