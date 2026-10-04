import { Injectable, isDevMode } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class LogService {
    log(...args: unknown[]): void {
        if (isDevMode()) {
            console.log(...args)
        }
    }

    warn(...args: unknown[]): void {
        if (isDevMode()) {
            console.warn(...args)
        }
    }

    error(...args: unknown[]): void {
        if (isDevMode()) {
            console.error(...args)
        }
    }
}
