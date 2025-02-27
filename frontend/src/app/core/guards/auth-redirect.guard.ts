import { Injectable, inject } from '@angular/core'
import { CanActivate, Router } from '@angular/router'
import { LoginService } from '../services/login.service'

/**
 * Prevents access a route and redirects to the dashboard if the user is already authenticated.
 */
@Injectable({ providedIn: 'root' })
export class GuestOnlyGuard implements CanActivate {
    private readonly router = inject(Router)
    private readonly loginService = inject(LoginService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    // loginService
    public readonly loginState$ = this.loginService.loginState

    public canActivate(): boolean {
        const token = this.loginState$().token

        if (token) {
            // If token exists, redirect to dashboard
            this.router.navigate(['/dashboard'])
            return false // Prevent navigation to the login/register page
        }

        return true // Allow access if there's no token
    }
}
