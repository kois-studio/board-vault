// auth.guard.ts
import { inject } from '@angular/core'
import { CanActivateFn } from '@angular/router'
import { Observable, of } from 'rxjs'
import { map } from 'rxjs/operators'

import { LoginService } from '../services/login.service'

/**
 * Prevents access to a route if the user is not authenticated.
 * Validates the Clerk session with the backend if present.
 */
export const AuthOnlyGuard: CanActivateFn = (): Observable<boolean> => {
    const loginService = inject(LoginService)

    // Optimization: If LoginService already knows the user is authenticated,
    // (e.g., from a previous check in this app session), allow access immediately.
    if (loginService.isAuthenticated()) {
        // It's assumed that if isAuthenticated is true,
        // verifySession has already run and handled data loading.
        return of(true)
    }

    // If not already marked as authenticated, verify the session.
    // This will also handle fetching user data on success.
    return loginService.verifySession().pipe(
        map((isAuthenticated) => {
            if (isAuthenticated) {
                return true
            }
            // Navigation to '/' or login page is handled within loginService on authentication failure.
            return false
        }),
    )
}
