// auth.guard.ts
import { Injectable, inject } from '@angular/core'
import { CanActivate, Router } from '@angular/router'
import { LoginService } from '../services/login.service'

/**
 * Prevents access to a route if the user is not authenticated.
 */
@Injectable({ providedIn: 'root' })
export class AuthOnlyGuard implements CanActivate {
    private readonly router = inject(Router)
    private readonly loginService = inject(LoginService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    // loginService
    public readonly loginState$ = this.loginService.loginState

    canActivate(): boolean {
        const token = this.loginState$().token

        if (token) {
            // If token exists, allow access to the route
            return true
        }

        // If no token, redirect to landing page
        this.router.navigate(['/'])
        return false
    }
}
