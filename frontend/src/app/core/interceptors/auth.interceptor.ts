// auth-interceptor.ts
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { from, throwError } from 'rxjs'
import { catchError, switchMap } from 'rxjs/operators'
import { ToastService } from '../../components/toast/toast.service'
import { pageLocale } from '../i18n/format'
import { ClerkService } from '../services/clerk.service'
import { LogService } from '../services/log.service'
import { LoginService } from '../services/login.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router)
    const logService = inject(LogService)
    const loginService = inject(LoginService)
    const clerkService = inject(ClerkService)
    const toastService = inject(ToastService)

    // The API answers in the page's language (ADR-0024): tag names, titles, anything it words.
    const requestWithToken = (token: string | null) =>
        req.clone({
            setHeaders: {
                'Accept-Language': pageLocale(),
                ...(token && !req.headers.has('Authorization') ? { Authorization: `Bearer ${token}` } : {}),
            },
        })

    return from(clerkService.getToken()).pipe(
        switchMap((clerkToken) => next(requestWithToken(clerkToken))),
        catchError((error: unknown) => {
            if (error instanceof HttpErrorResponse && error.status === 401) {
                // The API rejected the Clerk session (expired, revoked, or not linked).
                logService.error('AuthInterceptor: Received 401. Logging out.', error)
                toastService.warning($localize`:Toast when the sign-in session ended:Your session has expired. Please log in again.`)
                loginService.handleAuthErrorAndLogout()
                router.navigate(['/login'], {
                    queryParams: { reason: 'session_expired' },
                })
            }
            // Re-throw the error to propagate it to component-level handlers
            return throwError(() => error)
        }),
    )
}
