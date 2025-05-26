// auth.guard.ts
import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { HttpErrorResponse } from '@angular/common/http'
import { Observable, of } from 'rxjs'
import { map, catchError } from 'rxjs/operators'

import { LoginService } from '../services/login.service'
import { Api } from '../../api/api'
import { LogService } from '../services/log.service'
import { ToastService } from '../../components/toast/toast.service'

/**
 * Prevents access to a route if the user is not authenticated.
 * Validates token with the backend if present.
 */
export const AuthOnlyGuard: CanActivateFn = (): Observable<boolean> => {
    const api = inject(Api)
    const router = inject(Router)
    const logger = inject(LogService)
    const loginService = inject(LoginService)
    const toastService = inject(ToastService)

    const token = loginService.token

    if (!token) {
        logger.log('AuthOnlyGuard: No token found, redirecting to /')
        router.navigate(['/'])
        return of(false)
    }

    // If token exists, make call to validation endpoint
    logger.log('AuthOnlyGuard: Token found, validating with backend...')
    return api.authStatus().pipe(
        map(response => {
            if (response && response.isValid) {
                logger.log('AuthOnlyGuard: Token is valid.')
                return true
            }
            // This should never happen, because invalid token returns 401 error, not a `isValid: false` response.
            // If response is not as expected, treat as invalid
            logger.warn('AuthOnlyGuard: Token validation response not as expected.', response)
            toastService.warning('Your session has expired. Redirecting to login...')
            loginService.logOut() // Clear the invalid token
            router.navigate(['/'])
            return false
        }),
        catchError((error: HttpErrorResponse) => {
            logger.error('AuthOnlyGuard: Token validation failed.', error)
            toastService.warning('Your session has expired. Redirecting to login...')
            loginService.logOut() // Clear the invalid token
            router.navigate(['/'])
            return of(false)
        }),
    )
}
