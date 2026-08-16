import { HttpErrorResponse } from '@angular/common/http'
// src/app/core/services/login.service.ts
import { Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { Observable, of } from 'rxjs'
import { catchError, map } from 'rxjs/operators'

import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { LOADING_KEYS } from '../enums/loading-keys-enum'
import { ClerkService } from './clerk.service'
import { DataService } from './data.service'
import { LoadingService } from './loading.service'
import { LocalStorageService } from './local-storage.service'
import { LogService } from './log.service'

@Injectable({ providedIn: 'root' })
export class LoginService {
    // --- Injected Services ---
    private readonly api = inject(Api)
    private readonly router = inject(Router)
    private readonly logger = inject(LogService)
    private readonly dataService = inject(DataService)
    private readonly toastService = inject(ToastService)
    private readonly loadingService = inject(LoadingService)
    private readonly localStorageService = inject(LocalStorageService)
    private readonly clerkService = inject(ClerkService)

    // --- localStorage Keys ---
    private readonly KEYS = {
        ACCESS_TOKEN: 'access_token',
    }

    // --- Signals for Authentication State ---
    public readonly isAuthenticated = signal<boolean>(false)
    public readonly currentUserId = signal<number | null>(null)
    public readonly isCurrentUserAdmin = signal<boolean>(false)
    public readonly authProvider = signal<'legacy' | 'clerk' | null>(null)

    // --- Token Management ---
    get token(): string | null {
        return this.localStorageService.getItem(this.KEYS.ACCESS_TOKEN)
    }

    set token(token: string | null) {
        if (token) {
            this.localStorageService.setItem(this.KEYS.ACCESS_TOKEN, token)
        } else {
            this.localStorageService.removeItem(this.KEYS.ACCESS_TOKEN)
        }
    }

    /**
     * Called by AuthOnlyGuard (and potentially on app init).
     * Verifies token, updates auth state, and fetches initial user data.
     */
    public verifyTokenAndFetchUserData(): Observable<boolean> {
        if (this.clerkService.isSignedIn()) {
            return this.verifyClerkSession()
        }

        const currentToken = this.token

        if (!currentToken) {
            this.logger.log('LoginService: No token found during verification.')
            this._performLogoutCleanup()
            this.router.navigate(['/'])
            return of(false)
        }

        this.logger.log('LoginService: Token found, validating with backend...')
        return this.api.authStatus().pipe(
            map((response) => {
                if (response?.isValid && response?.userId !== undefined) {
                    this.logger.log('LoginService: Token is valid.', response)
                    this.isAuthenticated.set(true)
                    this.currentUserId.set(response.userId)
                    this.isCurrentUserAdmin.set(response.isAdmin || false)
                    this.authProvider.set('legacy')
                    this._fetchInitialUserData(response.userId)
                    return true
                }

                // NOTE: this should never happen
                // Token was present, but /auth/status response was not as expected
                this.logger.warn('LoginService: Token validation response not as expected or invalid.', response)
                this.toastService.warning('Your session may be invalid. Please log in again.')
                this._performLogoutCleanup()
                this.router.navigate(['/'])
                return false
            }),
            catchError((error: HttpErrorResponse) => {
                this.logger.error('LoginService: Error validating token via /auth/status API.', error)

                // If the error is NOT a 401 from /auth/status, it means the interceptor
                // did NOT handle the logout for this specific error.
                // (Because the interceptor only acts on 401s from non-/auth/login URLs).
                // So, if it's any other error type (e.g., 500, network error),
                // or even a 401 that somehow bypassed the interceptor (unlikely),
                // we need to perform cleanup and show a generic error.
                if (error.status !== 401 || (error.status === 401 && !error.url?.endsWith('/auth/status'))) {
                    // This condition means:
                    // 1. It's not a 401 at all (e.g., 500, 0 for network error)
                    // OR
                    // 2. It IS a 401, but NOT from /auth/status (this case is less likely here,
                    //    as this catchError is specifically for the /auth/status call,
                    //    but it's a safe check).
                    //    The primary scenario for this block is non-401 errors from /auth/status.

                    this.toastService.error('Could not verify your session. Please log in again.')
                    this._performLogoutCleanup()
                    this.router.navigate(['/'])
                }
                // If it WAS a 401 from /auth/status, the AuthInterceptor already handled
                // the toast, cleanup (via handleAuthErrorAndLogout), and navigation.
                // So, we don't do it again here to avoid double actions.

                return of(false) // Always return an Observable<boolean>
            }),
        )
    }

    public verifyClerkSession(): Observable<boolean> {
        return this.api.clerkAuthStatus().pipe(
            map((response) => {
                if (!response?.isValid || response.userId === undefined) {
                    return false
                }

                this.logger.log('LoginService: Clerk session is valid.', response)
                this.isAuthenticated.set(true)
                this.currentUserId.set(response.userId)
                this.isCurrentUserAdmin.set(response.isAdmin)
                this.authProvider.set('clerk')
                this._fetchInitialUserData(response.userId)
                return true
            }),
            catchError((error: HttpErrorResponse) => {
                this.logger.error('LoginService: Error validating Clerk session.', error)
                this._performLogoutCleanup()
                return of(false)
            }),
        )
    }

    /**
     * Initiates the loading of essential user data after authentication.
     */
    private _fetchInitialUserData(userId: number): void {
        this.logger.log(`LoginService: Triggering USER_DATA load for user ID: ${userId}`)
        this.loadingService.start(LOADING_KEYS.USER_DATA)

        this.api.getUserById(userId).subscribe({
            next: (userData) => {
                this.logger.log('LoginService: USER_DATA fetched successfully.')
                this.dataService.currentUser.set(userData)
                this.loadingService.finish(LOADING_KEYS.USER_DATA)
            },
            error: (err) => {
                this.logger.error('LoginService: Critical error - Failed to fetch USER_DATA after successful auth. Logging out.', err)
                this.toastService.error(
                    // Specific toast for this critical failure
                    'Failed to load essential user information. Please log in again.',
                )
                this._performLogoutCleanup()
                this.router.navigate(['/'])
                // Ensure USER_DATA loading is also marked as finished to prevent UI hangs
                this.loadingService.finish(LOADING_KEYS.USER_DATA)
            },
        })
    }

    /**
     * Clears all authentication data, resets signals, and navigates.
     * This is the core cleanup logic. Toasts are handled by calling methods.
     */
    private _performLogoutCleanup(): void {
        this.logger.log('LoginService: Performing logout cleanup.')

        this.token = null // Clear from localStorage via service properties
        this.isAuthenticated.set(false)
        this.currentUserId.set(null)
        this.isCurrentUserAdmin.set(false)
        this.authProvider.set(null)
        this.dataService.currentUser.set(null) // Clear currentUser in DataService
        this.loadingService.setAllLoadingTo(true) // Reset all loading states
    }

    /**
     * Public method for when a user explicitly clicks a logout button.
     * Shows a success toast.
     */
    public logOut(): void {
        this.logger.log('LoginService: User initiated logout.')
        // Potentially call a backend logout endpoint here if you have one
        // this.api.logout().subscribe();

        this._performLogoutCleanup()
        this.router.navigate(['/']) // Or your designated login/home page
        this.toastService.success('You have been successfully logged out.')
    }

    /**
     * Called by AuthInterceptor when a 401 (not from /auth/login) occurs.
     * The interceptor already shows the "session expired" toast.
     * This method just handles cleanup and navigation.
     */
    public handleAuthErrorAndLogout(): void {
        this.logger.log('LoginService: Handling auth error and logging out (from interceptor).')
        this._performLogoutCleanup()
        // Navigation is handled by the interceptor in this case,
        // but can be duplicated here if preferred for consistency,
        // though the interceptor already does it.
        // this.router.navigate(['/login'], { queryParams: { reason: 'session_expired' } });
        // NO toast here, as the interceptor shows "Your session has expired..."
    }

    /**
     * Call this method after a successful user login via credentials.
     * It stores the token, updates auth signals, and fetches initial data.
     */
    public handleSuccessfulLogin(accessToken: string, userId: number, isAdmin: boolean): void {
        this.logger.log(`LoginService: Handling successful login for user ID: ${userId}`)
        this.token = accessToken

        this.isAuthenticated.set(true)
        this.currentUserId.set(userId)
        this.isCurrentUserAdmin.set(isAdmin)
        this.authProvider.set('legacy')

        this._fetchInitialUserData(userId)
        this.router.navigate(['/dashboard'])
    }
}
