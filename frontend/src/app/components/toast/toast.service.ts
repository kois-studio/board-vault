import { Injectable } from '@angular/core'

interface Toast {
    id: string
    message: string
    type: 'success' | 'error' | 'info' | 'warning' | 'generic'
}

@Injectable({
    providedIn: 'root',
})
export class ToastService {
    toasts: Toast[] = [
        // Testing toasts
        // { id: crypto.randomUUID(), message: 'This is a success message!', type: 'success' },
        // { id: crypto.randomUUID(), message: 'This is a info message.', type: 'info' },
        // { id: crypto.randomUUID(), message: 'This is a warning message.', type: 'warning' },
        // { id: crypto.randomUUID(), message: 'This is an error message!', type: 'error' },
        // { id: crypto.randomUUID(), message: 'This is a generic message.', type: 'generic' },
    ]

    private _addToast(message: string, type: Toast['type']): void {
        const id = crypto.randomUUID()
        this.toasts.push({ id, message, type })

        // Automatically remove the toast after 5 seconds
        setTimeout(() => {
            this._removeToastById(id)
        }, 5000)
    }

    private _removeToastById(id: string): void {
        this.toasts = this.toasts.filter((toast) => toast.id !== id)
    }

    success(message: string): void {
        this._addToast(message, 'success')
    }

    error(message: string): void {
        this._addToast(message, 'error')
    }

    info(message: string): void {
        this._addToast(message, 'info')
    }

    warning(message: string): void {
        this._addToast(message, 'warning')
    }

    generic(message: string): void {
        this._addToast(message, 'generic')
    }

    removeToast(index: number): void {
        this.toasts.splice(index, 1)
    }
}
