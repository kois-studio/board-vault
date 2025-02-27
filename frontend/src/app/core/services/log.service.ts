import { Injectable, isDevMode } from '@angular/core'

@Injectable({ providedIn: 'root' })
export class LogService {
    log(...args: any[]): void {
        if (isDevMode()) {
            console.log(...args)
        }
    }

    warn(...args: any[]): void {
        if (isDevMode()) {
            console.warn(...args)
        }
    }

    error(...args: any[]): void {
        if (isDevMode()) {
            console.error(...args)
        }
    }
}
