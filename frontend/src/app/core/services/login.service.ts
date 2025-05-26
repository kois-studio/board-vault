import { HttpErrorResponse } from '@angular/common/http'
// src/app/core/services/login.service.ts
import { Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { Observable, of } from 'rxjs'
import { catchError, map } from 'rxjs/operators'

import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { LOADING_KEYS } from '../enums/loading-keys-enum'
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

    // --- localStorage Keys ---
    private readonly KEYS = {
        ACCESS_TOKEN: 'access_token',
    }

    // --- Signals for Authentication State ---
    public readonly isAuthenticated = signal<boolean>(false)
    public readonly currentUserId = signal<number | null>(null)
    public readonly isCurrentUserAdmin = signal<boolean>(false)

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
        const currentToken = this.token

        if (!currentToken) {
            this.logger.log('LoginService: No token found during verification.')
            // Ensure state is clean if somehow called without a token
            // but guard should prevent this for protected routes.
            this._clearAuthDataAndNavigate(false) // Don't show toast if no token initially
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
                    this._fetchInitialUserData(response.userId)
                    return true
                }

                this.logger.warn('LoginService: Token validation response not as expected or invalid.', response)
                this.toastService.warning('Your session may be invalid. Please log in again.')
                this._clearAuthDataAndNavigate()
                return false
            }),
            catchError((error: HttpErrorResponse) => {
                this.logger.error('LoginService: Token validation failed via API.', error)
                this.toastService.warning('Your session has expired. Please log in again.')
                this._clearAuthDataAndNavigate()
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
                this.logger.error('LoginService: Failed to fetch USER_DATA.', err)
                this.loadingService.finish(LOADING_KEYS.USER_DATA) // Still finish to unblock UI
                this._clearAuthDataAndNavigate()
            },
        })
    }

    /**
     * Clears all authentication data, resets signals, and navigates to home/login.
     * @param showToast Whether to show a session expiration toast.
     */
    private _clearAuthDataAndNavigate(showToast = true): void {
        this.logger.log('LoginService: Clearing auth data and navigating.')
        if (showToast) {
            this.toastService.info('You have been logged out.')
        }

        // Clear from localStorage via service properties
        this.token = null

        // Reset signals
        this.isAuthenticated.set(false)
        this.currentUserId.set(null)
        this.isCurrentUserAdmin.set(false)

        // Clear currentUser in DataService
        this.dataService.currentUser.set(null)

        // Reset all loading states in LoadingService
        this.loadingService.setAllLoadingTo(true) // Or a more specific reset

        this.router.navigate(['/']) // Or your designated login/home page
    }

    /**
     * Public method to log out the user.
     */
    public logOut(): void {
        this.logger.log('LoginService: User initiated logout.')
        // Potentially call a backend logout endpoint here if you have one
        // this.api.logout().subscribe();

        this._clearAuthDataAndNavigate()
        this.toastService.success('You have been successfully logged out.')
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

        this._fetchInitialUserData(userId)
        this.router.navigate(['/dashboard'])
    }
}
