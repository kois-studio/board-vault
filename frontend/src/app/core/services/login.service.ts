import { Injectable, WritableSignal, inject, signal } from '@angular/core'
import { Api } from '../../api/api'
import { LocalStorageService } from './local-storage.service'
import { LogService } from './log.service'

type LoginStateType = {
    token: null | string
    valid: boolean
    timestamp: null | number
}

type LocalStorageLoginStateType = {
    token: string
    valid: boolean
    timestamp: number
}

/**
 * This will handle:
 *  - if the user is logged in or not
 *  - when the user makes F5, decides if needs to refresh the token or not (depending on a timestamp)
 */
@Injectable({ providedIn: 'root' })
export class LoginService {
    private readonly api = inject(Api)
    private readonly logService = inject(LogService)
    private readonly localStorageService = inject(LocalStorageService)

    // --------------------------------------------------------------------------
    //        Local storage key
    // --------------------------------------------------------------------------
    private readonly localstorage_key = 'login_state'

    // --------------------------------------------------------------------------
    //        Login state
    // --------------------------------------------------------------------------
    public readonly loginState: WritableSignal<LoginStateType> = signal({ token: null, valid: false, timestamp: null })

    constructor() {
        // in case the user was authenticated before (example: F5)
        this._loadToken()
    }

    // #region Methods

    /**
     * Initial method
     * Sets the token (on login) generating the timestamp
     */
    logIn(token: string): void {
        const loginState: LocalStorageLoginStateType = {
            token,
            valid: true,
            timestamp: Date.now(),
        }
        this.localStorageService.setItem(this.localstorage_key, JSON.stringify(loginState))
        this.loginState.set({
            token,
            valid: true, // true because this comes straight from the server
            timestamp: Date.now(), // when did the user login
        })
    }

    logOut(): void {
        this.localStorageService.removeItem(this.localstorage_key)
        this.loginState.set({
            token: null,
            valid: false,
            timestamp: 0,
        })
    }

    // #region Private methods

    /**
     * This is tricky, 3 options:
     * 1. the user is not authenticated (loginState is null)
     * 2. the user is authenticated and valid (loginState is not null and timestamp is recent)
     * 3. the user is authenticated but not valid (loginState is not null but timestamp is old)
     */
    private _loadToken(): void {
        const rawLoginState = this.localStorageService.getItem(this.localstorage_key)

        // case 1: the user is not authenticated
        if (!rawLoginState) {
            this.loginState.set({
                token: null,
                valid: false,
                timestamp: null,
            })
            return
        }

        const { token, timestamp } = JSON.parse(rawLoginState) as LocalStorageLoginStateType

        const isRecent = timestamp && timestamp > Date.now() - 10 // 30min

        // case 2: authenticated AND recent
        if (isRecent) {
            this.loginState.set({
                token,
                valid: true,
                timestamp,
            })
            return
        }

        // case 3: authenticated and NOT recent
        // it will require a server-check before showing the UI
        // so we make a server-check with a getUserByEmail request
        this.api.getUserByEmail(token).subscribe({
            next: (user) => {
                if (user) {
                    this.loginState.set({
                        token,
                        valid: true,
                        timestamp,
                    })
                }
            },
            error: () => {
                this.loginState.set({
                    token: null,
                    valid: false,
                    timestamp: null,
                })
            },
        })
    }
}
