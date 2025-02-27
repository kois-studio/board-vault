import { Injectable, inject } from '@angular/core'
import { LocalStorageService } from './local-storage.service'

@Injectable({ providedIn: 'root' })
export class LoginService {
    private readonly localStorageService = inject(LocalStorageService)

    // props
    private readonly KEYS = {
        ACCESS_TOKEN: 'access_token',
        EMAIL: 'email',
    }

    // #region methods

    public logOut(): void {
        this.localStorageService.removeItem(this.KEYS.ACCESS_TOKEN)
        this.localStorageService.removeItem(this.KEYS.EMAIL)
    }

    // #region ACCESS_TOKEN

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

    // #region EMAIL
    get email(): string | null {
        return this.localStorageService.getItem(this.KEYS.EMAIL)
    }

    set email(email: string | null) {
        if (email) {
            this.localStorageService.setItem(this.KEYS.EMAIL, email)
        } else {
            this.localStorageService.removeItem(this.KEYS.EMAIL)
        }
    }
}
