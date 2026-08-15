import { Injectable, inject } from '@angular/core'
import { CanActivate, Router } from '@angular/router'
import { ClerkService } from '../services/clerk.service'
import { LoginService } from '../services/login.service'

/**
 * Prevents access a route and redirects to the dashboard if the user is already authenticated.
 */
@Injectable({ providedIn: 'root' })
export class GuestOnlyGuard implements CanActivate {
    private readonly router = inject(Router)
    private readonly loginService = inject(LoginService)
    private readonly clerkService = inject(ClerkService)

    public canActivate(): boolean {
        const token = this.loginService.token

        if (token || this.loginService.isAuthenticated() || this.clerkService.isSignedIn()) {
            // If token exists, redirect to dashboard
            this.router.navigate(['/dashboard'])
            return false // Prevent navigation to the login/register page
        }

        return true // Allow access if there's no token
    }
}
