import { Injectable } from '@angular/core'

@Injectable({
    providedIn: 'root',
})
export class LocalStorageService {
    public token: string | null = null

    setItem(key: string, value: string): void {
        localStorage.setItem(key, value)
    }

    getItem(key: string): string | null {
        return localStorage.getItem(key)
    }

    removeItem(key: string): void {
        localStorage.removeItem(key)
    }

    clear(): void {
        localStorage.clear()
    }

    // Custom methods
    setToken(token: string): void {
        this.setItem('access_token', token)
        this.token = token
    }
    deleteToken(): void {
        this.removeItem('access_token')
        this.token = null
    }

    getToken(): string | null {
        const token = this.getItem('access_token')
        this.token = token
        return token ? `Bearer ${token}` : null
    }
}
