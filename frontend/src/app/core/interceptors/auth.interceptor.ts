// auth-interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { LoginService } from '../services/login.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const loginService = inject(LoginService)
    const token = loginService.loginState().token

    if (token) {
        // Clone the request and add the Authorization header
        const authReq = req.clone({
            setHeaders: { Authorization: `Bearer ${token}` },
        })
        return next(authReq)
    }

    // Pass the request unchanged if there's no token
    return next(req)
}
