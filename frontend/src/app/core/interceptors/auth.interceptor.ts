// auth-interceptor.ts
import { HttpInterceptorFn } from '@angular/common/http'
import { inject } from '@angular/core'
import { LocalStorageService } from '../services/local-storage.service'

export const authInterceptor: HttpInterceptorFn = (req, next) => {
    const localStorageService = inject(LocalStorageService)
    const token = localStorageService.getItem('access_token')

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
