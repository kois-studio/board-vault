import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import type { NotificationType } from '../../api/api.types'

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'app-card-notification',
    templateUrl: 'card-notification.component.html',
})
export class CardNotificationComponent {
    @Input({ required: true }) notification: null | NotificationType = null

    markAsRead(notificationId: number) {
        console.log('Marking as read:', this.notification)
    }

    deleteNotification(notificationId: number) {
        console.log('Deleting:', this.notification)
    }
}
