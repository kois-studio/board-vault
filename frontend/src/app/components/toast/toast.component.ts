import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { ToastService } from './toast.service'

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'app-toast',
    templateUrl: 'toast.component.html',
})
export class ToastComponent {
    constructor(public toastService: ToastService) {}

    closeToast(index: number): void {
        this.toastService.removeToast(index)
    }
}
