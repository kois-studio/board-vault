import { Injectable } from '@angular/core'
import { v4 as uuidv4 } from 'uuid'

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
        // { id: uuidv4(), message: 'Welcome to the app!', type: 'success' },
        // { id: uuidv4(), message: 'Please log in to continue.', type: 'info' },
        // { id: uuidv4(), message: 'This is a warning message.', type: 'warning' },
        // { id: uuidv4(), message: 'This is an error message.', type: 'error' },
        // { id: uuidv4(), message: 'This is a generic message.', type: 'generic' },
    ]

    private _addToast(message: string, type: Toast['type']): void {
        const id = uuidv4()
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
