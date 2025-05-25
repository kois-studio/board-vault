// auth-interceptor.ts
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http'
import { inject } from '@angular/core'
import { Router } from '@angular/router'
import { throwError } from 'rxjs'
import { catchError } from 'rxjs/operators'
import { LoginService } from '../services/login.service'
import { ToastService } from '../../components/toast/toast.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const router = inject(Router)
    const loginService = inject(LoginService)
    const toastService = inject(ToastService)

    const token = loginService.token

    // Initialize authReq with the original request
    let authReq = req

    if (token) {
        // Clone the request and add the Authorization header
        authReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
        })
    }

    // Pass the cloned or original request to the next handler
    return next(authReq).pipe(
        catchError((error: any) => {
            // If 401 (unauthorized), we assume the token is expired and log out the user
            if (error instanceof HttpErrorResponse && error.status === 401) {
                console.error('AuthInterceptor: Received 401 Unauthorized. Logging out.', error)
                toastService.warning('Your session has expired. Redirecting to login...')
                loginService.logOut() // Clear the invalid token
                router.navigate(['/login'], { queryParams: { reason: 'session_expired' } })
            }

            /**
             * It's important to either complete the stream or re-throw an error.
             * Re-throwing the original error is often good practice so that component-level error handlers (if any) can also react.
             * However, for a 401 leading to logout, you might also consider returning EMPTY or a new error indicating session expiry.
             * For now, let's re-throw.
             */
            // Re-throw the error to propagate it
            return throwError(() => error)
        }),
    )
}
