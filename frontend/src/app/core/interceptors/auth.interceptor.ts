// auth-interceptor.ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { from, throwError } from 'rxjs'
import { catchError, switchMap } from 'rxjs/operators'
import { ToastService } from '../../components/toast/toast.service'
import { ClerkService } from '../services/clerk.service'
import { LogService } from '../services/log.service'
import { LoginService } from '../services/login.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router)
    const logService = inject(LogService)
    const loginService = inject(LoginService)
    const clerkService = inject(ClerkService)
    const toastService = inject(ToastService)

    const requestWithToken = (token: string | null) => {
        if (!token || req.headers.has('Authorization')) {
            return req
        }

        return req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
        })
    }

    const clerkTokenRequest =
        loginService.isAuthenticated() && loginService.authProvider() !== 'clerk' ? Promise.resolve(null) : clerkService.getToken()

    return from(clerkTokenRequest).pipe(
        switchMap((clerkToken) => next(requestWithToken(clerkToken ?? loginService.token))),
        catchError((error: any) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                // Check if the 401 is from the login endpoint itself
                // You might need to adjust the URL check if your API base URL is complex
                if (error.url?.endsWith('/auth/login')) {
                    logService.warn('AuthInterceptor: Received 401 from /auth/login. Letting component handle.', error)
                    // For a 401 from /auth/login, do NOT treat it as a session expiry.
                    // The login component's error handler will display the appropriate message.
                    // Just re-throw the error.
                } else {
                    // For any other 401, assume session expired or token is invalid
                    logService.error('AuthInterceptor: Received 401 (not from /auth/login). Logging out.', error)

                    // Show the "session expired" toast
                    toastService.warning('Your session has expired. Please log in again.')

                    // Call a more specific logout method in LoginService that doesn't show its own toasts,
                    // or ensure LoginService.logOut() is modified.
                    // Let's create a new method in LoginService for this scenario.
                    loginService.handleAuthErrorAndLogout()

                    router.navigate(['/login'], {
                        queryParams: { reason: 'session_expired' },
                    })
                }
            }
            // Re-throw the error to propagate it to component-level handlers
            return throwError(() => error)
        }),
    )
}
