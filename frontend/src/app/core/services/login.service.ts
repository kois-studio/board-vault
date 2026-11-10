import { DOCUMENT } from '@angular/common'
import { computed, DestroyRef, effect, Injectable, inject, signal } from '@angular/core'
import { Router } from '@angular/router'
import { from, Observable, of, throwError } from 'rxjs'
import { catchError, finalize, map, shareReplay, switchMap, tap } from 'rxjs/operators'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { LOADING_KEYS } from '../enums/loading-keys-enum'
import { AccountLanguageService } from '../i18n/account-language.service'
import { withoutReadRetry } from '../interceptors/resilience.interceptor'
import { isServerUnreachable } from '../utils/serverUnreachable'
import { ClerkService } from './clerk.service'
import { DataService } from './data.service'
import { LoadingService } from './loading.service'
import { LogService } from './log.service'

/**
 * Where finishing a sign-in stands. `error`: the account cannot be linked (an invitation problem, a 409).
 * `unavailable`: Board Vault could not be reached; the sign-in is fine and the app keeps trying.
 */
export type ClerkAuthHandoffState = 'idle' | 'linking' | 'ready' | 'error' | 'unavailable'

/** Waits between automatic tries while Board Vault cannot be reached; the last one repeats. */
export const RECONNECT_DELAYS_MS = [2_000, 5_000, 10_000, 30_000] as const

@Injectable({ providedIn: 'root' })
export class LoginService {
    // --- Injected Services ---
    private readonly api = inject(Api)
    private readonly router = inject(Router)
    private readonly logger = inject(LogService)
    private readonly dataService = inject(DataService)
    private readonly toastService = inject(ToastService)
    private readonly loadingService = inject(LoadingService)
    private readonly clerkService = inject(ClerkService)
    private readonly accountLanguage = inject(AccountLanguageService)
    private readonly document = inject(DOCUMENT)

    // --- Signals for Authentication State ---
    public readonly isAuthenticated = signal<boolean>(false)
    public readonly currentUserId = signal<number | null>(null)
    public readonly isCurrentUserAdmin = signal<boolean>(false)
    public readonly clerkAuthHandoffState = signal<ClerkAuthHandoffState>('idle')
    public readonly clerkAuthHandoffError = signal<string | null>(null)
    public readonly isClerkAuthHandoffActive = computed(() => this.clerkService.isSignedIn() && !this.isAuthenticated())
    /** A new try is running while Board Vault was unreachable; the screen stays put instead of going back to "Connecting you…". */
    public readonly isReconnecting = signal(false)

    private clerkVerificationInFlight: Observable<boolean> | null = null
    private reconnectAttempt = 0
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null
    /** A page that could not open before the account was known (Administration); see openOnceAccountIsKnown. */
    private pageToOpenOnceKnown: string | null = null

    constructor() {
        // Coming back to the tab, or the browser going back online, is the best moment to try again.
        const view = this.document.defaultView
        const tryNow = () => {
            if (this.clerkAuthHandoffState() === 'unavailable' && this.document.visibilityState !== 'hidden') this.retryClerkSession()
        }
        this.document.addEventListener('visibilitychange', tryNow)
        view?.addEventListener('online', tryNow)
        inject(DestroyRef).onDestroy(() => {
            this.document.removeEventListener('visibilitychange', tryNow)
            view?.removeEventListener('online', tryNow)
            this.cancelReconnect()
        })

        effect(() => {
            const clerkUserId = this.clerkService.userId()

            if (!clerkUserId || this.isAuthenticated() || this.clerkVerificationInFlight) return

            this.verifyClerkSession().subscribe((isReady) => {
                if (isReady && this.shouldOpenDashboardAfterHandoff()) {
                    void this.router.navigate(['/dashboard'])
                }
            })
        })
    }

    /**
     * Called by AuthOnlyGuard and AdminGuard. Clerk owns the session; the
     * backend maps it to the Board Vault account and returns its id.
     */
    public verifySession(): Observable<boolean> {
        return from(this.clerkService.whenLoaded()).pipe(switchMap(() => this.verifyLoadedSession()))
    }

    private verifyLoadedSession(): Observable<boolean> {
        if (this.clerkService.isSignedIn()) {
            return this.verifyClerkSession()
        }

        this.logger.log('LoginService: No Clerk session found during verification.')
        this._performLogoutCleanup()
        this.router.navigate(['/'])
        return of(false)
    }

    public verifyClerkSession(): Observable<boolean> {
        if (this.clerkVerificationInFlight) return this.clerkVerificationInFlight

        // A try made by hand, by a guard, or by the tab coming back replaces the one that was waiting.
        this.cancelReconnect()
        if (this.clerkAuthHandoffState() === 'unavailable') this.isReconnecting.set(true)
        else this.clerkAuthHandoffState.set('linking')
        this.clerkAuthHandoffError.set(null)

        // Both requests give up after 12 s (resilienceInterceptor, #240) and are not tried again there: the
        // reconnect schedule here is the retry.
        const verification$ = this.api.clerkAuthStatus().pipe(
            switchMap((response) => {
                if (!response?.isValid || response.userId === undefined) {
                    this.reconnectAttempt = 0
                    this.pageToOpenOnceKnown = null
                    this.clerkAuthHandoffState.set('error')
                    this.clerkAuthHandoffError.set(this.clerkHandoffErrorMessage)
                    return of(false)
                }

                this.logger.log('LoginService: Clerk session is valid.', response)
                this.currentUserId.set(response.userId)
                this.isCurrentUserAdmin.set(response.isAdmin)
                return this._fetchInitialUserData(response.userId).pipe(
                    tap((isReady) => {
                        if (isReady) this.reconnectAttempt = 0
                        this.isAuthenticated.set(isReady)
                        this.clerkAuthHandoffState.set(isReady ? 'ready' : 'error')
                        if (!isReady) this.clerkAuthHandoffError.set(this.clerkHandoffErrorMessage)
                        this.openPageWaitingForAccount(isReady)
                    }),
                )
            }),
            catchError((error: unknown) => {
                if (isServerUnreachable(error)) {
                    // Nothing is wrong with the sign-in: keep the Clerk session and the account id, and try again.
                    this.logger.error('LoginService: Board Vault could not be reached while finishing sign-in.', error)
                    this.clerkAuthHandoffState.set('unavailable')
                    this.scheduleReconnect()
                    return of(false)
                }

                this.logger.error('LoginService: Error validating Clerk session.', error)
                this._performLogoutCleanup()
                this.clerkAuthHandoffState.set('error')
                this.clerkAuthHandoffError.set(this.clerkHandoffErrorMessage)
                return of(false)
            }),
            finalize(() => {
                this.clerkVerificationInFlight = null
                this.isReconnecting.set(false)
            }),
            // Runs to the end even if every caller stops listening (a guard whose navigation was replaced, say):
            // otherwise the request is dropped mid-way, no outcome is set, and the screen waits for nothing.
            shareReplay({ bufferSize: 1, refCount: false }),
        )

        this.clerkVerificationInFlight = verification$
        return verification$
    }

    public retryClerkSession(): void {
        if (!this.clerkService.isSignedIn() || this.isAuthenticated() || this.clerkVerificationInFlight) return
        this.verifyClerkSession().subscribe((isReady) => {
            if (isReady && this.shouldOpenDashboardAfterHandoff()) {
                void this.router.navigate(['/dashboard'])
            }
        })
    }

    public async signOutClerk(): Promise<void> {
        await this.clerkService.signOut()
        this.handleAuthErrorAndLogout()
        this.clerkAuthHandoffState.set('idle')
        this.clerkAuthHandoffError.set(null)
        await this.router.navigate(['/'])
    }

    /**
     * Initiates the loading of essential user data after authentication.
     */
    private _fetchInitialUserData(userId: number): Observable<boolean> {
        this.logger.log(`LoginService: Triggering USER_DATA load for user ID: ${userId}`)
        this.loadingService.start(LOADING_KEYS.USER_DATA)

        return this.api.getUserById(userId, withoutReadRetry()).pipe(
            tap((userData) => {
                this.logger.log('LoginService: USER_DATA fetched successfully.')
                this.dataService.currentUser.set(userData)
                this.accountLanguage.followAccountLanguage(userData)
                this.loadingService.finish(LOADING_KEYS.USER_DATA)
            }),
            map(() => true),
            catchError((err: unknown) => {
                // Board Vault could not be reached: the sign-in is fine, so verifyClerkSession keeps it and tries again.
                if (isServerUnreachable(err)) {
                    this.loadingService.finish(LOADING_KEYS.USER_DATA)
                    return throwError(() => err)
                }

                this.logger.error('LoginService: Critical error - Failed to fetch USER_DATA after successful auth. Logging out.', err)
                this.toastService.error(
                    // Specific toast for this critical failure
                    $localize`:Toast when the account could not be loaded right after signing in:Failed to load essential user information. Please log in again.`,
                )
                this._performLogoutCleanup()
                this.router.navigate(['/'])
                // Ensure USER_DATA loading is also marked as finished to prevent UI hangs
                this.loadingService.finish(LOADING_KEYS.USER_DATA)
                return of(false)
            }),
        )
    }

    /**
     * Clears all authentication data, resets signals, and navigates.
     * This is the core cleanup logic. Toasts are handled by calling methods.
     */
    private _performLogoutCleanup(): void {
        this.logger.log('LoginService: Performing logout cleanup.')
        this.cancelReconnect()
        this.reconnectAttempt = 0
        this.pageToOpenOnceKnown = null

        this.isAuthenticated.set(false)
        this.currentUserId.set(null)
        this.isCurrentUserAdmin.set(false)
        this.dataService.currentUser.set(null) // Clear currentUser in DataService
        this.loadingService.setAllLoadingTo(true) // Reset all loading states
    }

    /** The next automatic try: 2 s, 5 s, 10 s, then every 30 s. A hidden tab waits until it is shown again. */
    private scheduleReconnect(): void {
        const delay = RECONNECT_DELAYS_MS[Math.min(this.reconnectAttempt, RECONNECT_DELAYS_MS.length - 1)]
        this.reconnectAttempt++
        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null
            if (this.document.visibilityState !== 'hidden') this.retryClerkSession()
        }, delay)
    }

    private cancelReconnect(): void {
        if (this.reconnectTimer === null) return
        clearTimeout(this.reconnectTimer)
        this.reconnectTimer = null
    }

    private get clerkHandoffErrorMessage(): string {
        return $localize`:Error when finishing sign-in failed:We could not finish connecting this sign-in to Board Vault. Try again, or sign out and sign in again.`
    }

    /**
     * For a guard that cannot let anyone through until the account is known (Administration): it sends the
     * person to Home, where the handoff screen shows "Connecting you…" or that Board Vault cannot be reached,
     * and asks for its page to open once the account is known. Leaving Home in the meantime drops the request.
     */
    public openOnceAccountIsKnown(url: string): void {
        this.pageToOpenOnceKnown = url
    }

    private openPageWaitingForAccount(isReady: boolean): void {
        const url = this.pageToOpenOnceKnown
        if (url === null) return
        this.pageToOpenOnceKnown = null
        // The account can be known while the router is still opening Home (its page chunk loading): use where it is going.
        const navigation = this.router.currentNavigation?.()
        const current = (navigation?.finalUrl ?? navigation?.extractedUrl)?.toString() ?? this.router.url
        // Home was only a waiting room, so the page replaces it in the history.
        if (isReady && current.split(/[?#]/)[0] === '/dashboard') void this.router.navigateByUrl(url, { replaceUrl: true })
    }

    private shouldOpenDashboardAfterHandoff(): boolean {
        const path = this.router.url.split('?')[0]
        return path === '/' || path === '/login' || path === '/register'
    }

    /** After the account was deleted (ADR-0018): its Clerk user is gone, so signing out may fail and that is fine. */
    public async leaveAfterAccountDeletion(): Promise<void> {
        try {
            await this.clerkService.signOut()
        } catch {
            // The session ended with the Clerk user.
        }
        // Whether or not Clerk reported it: a signed-in Clerk user here would be verified again, get a
        // 401 for the deleted account, and show "session expired" over "account deleted".
        this.clerkService.forgetSession()
        this._performLogoutCleanup()
        this.clerkAuthHandoffState.set('idle')
        this.clerkAuthHandoffError.set(null)
        await this.router.navigate(['/'])
        this.toastService.success($localize`:Toast after someone deleted their account:Your account was deleted.`)
    }

    /**
     * Public method for when a user explicitly clicks a logout button.
     * Shows a success toast.
     */
    public async logOut(): Promise<void> {
        this.logger.log('LoginService: User initiated logout.')

        await this.clerkService.signOut()
        this._performLogoutCleanup()
        this.clerkAuthHandoffState.set('idle')
        this.clerkAuthHandoffError.set(null)
        await this.router.navigate(['/'])
        this.toastService.success($localize`:Toast after signing out:You have been successfully logged out.`)
    }

    /**
     * Called by AuthInterceptor when the API rejects the session with a 401.
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
}
