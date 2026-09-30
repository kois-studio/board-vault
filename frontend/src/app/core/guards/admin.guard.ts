// src/app/core/guards/admin.guard.ts
import { inject } from '@angular/core'
import { CanActivateFn, Router } from '@angular/router'
import { Observable, of } from 'rxjs'
import { map, switchMap } from 'rxjs/operators'
import { ToastService } from '../../components/toast/toast.service'
import { LogService } from '../services/log.service'
import { LoginService } from '../services/login.service'

export const AdminGuard: CanActivateFn = (route, state): Observable<boolean> | boolean => {
    const loginService = inject(LoginService)
    const router = inject(Router)
    const toastService = inject(ToastService)
    const logger = inject(LogService)

    // 1. Check if already authenticated in this session
    if (loginService.isAuthenticated()) {
        if (loginService.isCurrentUserAdmin()) {
            logger.log('AdminGuard: Access granted (already authenticated as admin).')
            return true
        }

        logger.warn('AdminGuard: Access denied (authenticated but not admin).')
        toastService.error('Access Denied: You do not have permission to view this page.')
        router.navigate(['/dashboard'])
        return false
    }

    // 2. If not authenticated in this session, try to verify the Clerk session
    logger.log('AdminGuard: Not authenticated in session, attempting session verification.')
    return loginService.verifySession().pipe(
        switchMap((isAuthenticated) => {
            if (isAuthenticated) {
                // Session was valid, user data (including admin status) is now loaded
                if (loginService.isCurrentUserAdmin()) {
                    logger.log('AdminGuard: Access granted (session verified, user is admin).')
                    return of(true)
                }

                logger.warn('AdminGuard: Access denied (session verified, but user is not admin).')
                toastService.error('Access Denied: You do not have permission to view this page.')
                router.navigate(['/dashboard'])
                return of(false)
            }

            // verifySession returned false (e.g., no session, rejected session, API error)
            // LoginService should have handled navigation to login/root and appropriate toasts
            // for session expiry or invalid session.
            // We add a specific toast for the admin access attempt.
            logger.log('AdminGuard: Session verification failed or user not authenticated. Redirecting to login.')
            toastService.info('Please log in with admin credentials to access this area.')
            router.navigate(['/login'], { queryParams: { returnUrl: state.url } })
            return of(false)
        }),
        // No catchError needed here usually, as verifySession
        // should handle its own errors and return Observable<false>
    )
}
