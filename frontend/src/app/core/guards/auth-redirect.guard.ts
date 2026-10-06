import { Injectable, inject } from '@angular/core'
import { CanActivate, Router } from '@angular/router'
import { ClerkService } from '../services/clerk.service'
import { LoginService } from '../services/login.service'

/**
 * Sends an authenticated user from the sign-in pages to the dashboard.
 *
 * It does not wait for Clerk, so /login and /register render at once (#92). A Clerk session that
 * Clerk finds afterwards shows the auth handoff, which then opens the dashboard (LoginService).
 */
@Injectable({ providedIn: 'root' })
export class GuestOnlyGuard implements CanActivate {
    private readonly router = inject(Router)
    private readonly loginService = inject(LoginService)
    private readonly clerkService = inject(ClerkService)

    public canActivate(): boolean {
        if (this.loginService.isAuthenticated() || this.clerkService.isSignedIn()) {
            this.router.navigate(['/dashboard'])
            return false // Prevent navigation to the login/register page
        }

        return true // Allow access if there's no session
    }
}
