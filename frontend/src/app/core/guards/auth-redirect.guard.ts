import { Injectable } from '@angular/core'
import { CanActivate, Router } from '@angular/router'
import { LocalStorageService } from '../services/local-storage.service'

/**
 * Prevents access a route and redirects to the dashboard if the user is already authenticated.
 */
@Injectable({
    providedIn: 'root',
})
export class AuthRedirectGuard implements CanActivate {
    constructor(
        private localStorageService: LocalStorageService,
        private router: Router,
    ) {}

    public canActivate(): boolean {
        const token = this.localStorageService.getToken()

        if (token) {
            // If token exists, redirect to dashboard
            this.router.navigate(['/dashboard'])
            return false // Prevent navigation to the login/register page
        }

        return true // Allow access if there's no token
    }
}
