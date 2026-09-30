// auth.guard.ts
import { inject } from '@angular/core'
import { ActivatedRouteSnapshot, CanActivateFn } from '@angular/router'
import { Observable, of } from 'rxjs'

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
 * a blank page while /auth/clerk/status answers. Other routes wait for the
 * verification.
 */
export const AuthOnlyGuard: CanActivateFn = (route: ActivatedRouteSnapshot): Observable<boolean> => {
    const loginService = inject(LoginService)
    const clerkService = inject(ClerkService)

    if (loginService.isAuthenticated()) {
        return of(true)
    }

    const layoutShowsHandoff = route.pathFromRoot.some((snapshot) => snapshot.data?.[SHOWS_AUTH_HANDOFF] === true)
    if (clerkService.isSignedIn() && layoutShowsHandoff) {
        loginService.verifySession().subscribe()
        return of(true)
    }

    // Navigation to '/' on failure is handled within LoginService.
    return loginService.verifySession()
}
