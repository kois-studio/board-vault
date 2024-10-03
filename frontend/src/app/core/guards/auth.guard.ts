// auth.guard.ts
import { Injectable } from '@angular/core'
import { CanActivate, Router } from '@angular/router'
import { LocalStorageService } from '../services/local-storage.service'

/**
 * Prevents access to a route if the user is not authenticated.
 */
@Injectable({
    providedIn: 'root',
})
export class AuthGuard implements CanActivate {
    constructor(
        private localStorageService: LocalStorageService,
        private router: Router,
    ) {}

    canActivate(): boolean {
        const token = this.localStorageService.getToken()

        if (token) {
            // If token exists, allow access to the route
            return true
        }

        // If no token, redirect to landing page
        this.router.navigate(['/'])
        return false
    }
}
