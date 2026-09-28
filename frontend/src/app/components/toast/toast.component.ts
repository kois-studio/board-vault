import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { IconComponent } from '../ui/icon/icon.component'
import { ToastService } from './toast.service'

@Component({
    imports: [CommonModule, IconComponent],
    selector: 'app-toast',
    templateUrl: 'toast.component.html',
    styles: [
        `
            @keyframes toast-progress {
                from {
                    opacity: 0;
                    transform: scaleX(0);
                }

                to {
                    opacity: 1;
                    transform: scaleX(1);
                }
            }

            @keyframes toast-enter {
                from {
                    opacity: 0;
                    transform: translateY(0.5rem);
                }

                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            .animate-toast-progress {
                animation: toast-progress 4.5s 0.3s linear;
            }

            .animate-toast-enter {
                animation: toast-enter 180ms ease-out;
            }
        `,
    ],
})
export class ToastComponent {
    constructor(public toastService: ToastService) {}

    closeToast(id: string): void {
        this.toastService.removeToast(id)
    }

    iconFor(type: 'success' | 'error' | 'info' | 'warning' | 'generic'): string {
        return {
            error: 'circle-alert',
            warning: 'circle-alert',
            info: 'info',
            success: 'circle-check',
            generic: 'info',
        }[type]
    }
}
