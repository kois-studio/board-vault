import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { ToastService } from './toast.service'

@Component({
    imports: [CommonModule],
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

            .animate-toast-progress {
                animation: toast-progress 4.5s 0.3s linear;
            }
        `,
    ],
})
export class ToastComponent {
    constructor(public toastService: ToastService) {}

    closeToast(index: number): void {
        this.toastService.removeToast(index)
    }
}
