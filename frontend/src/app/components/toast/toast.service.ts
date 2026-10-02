import { Injectable, signal } from '@angular/core'

/** A button inside a toast, such as "Undo". Clicking it also closes the toast. */
export interface ToastAction {
    label: string
    run: () => void
}

interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning' | 'generic'
    action?: ToastAction
}

@Injectable({
    providedIn: 'root',
})
export class ToastService {
    readonly toasts = signal<Toast[]>([])

    private _addToast(message: string, type: Toast['type'], action?: ToastAction): void {
        const id = crypto.randomUUID()
        this.toasts.update((toasts) => [...toasts, { id, message, type, action }])

        // Automatically remove the toast after 5 seconds
        setTimeout(() => {
            this.removeToast(id)
        }, 5000)
    }

    success(message: string, action?: ToastAction): void {
        this._addToast(message, 'success', action)
    }

    error(message: string): void {
        this._addToast(message, 'error')
    }

    info(message: string, action?: ToastAction): void {
        this._addToast(message, 'info', action)
    }

    warning(message: string): void {
        this._addToast(message, 'warning')
    }

    generic(message: string): void {
        this._addToast(message, 'generic')
    }

    removeToast(id: string): void {
        this.toasts.update((toasts) => toasts.filter((toast) => toast.id !== id))
    }
}
