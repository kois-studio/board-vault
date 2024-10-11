import { CommonModule } from '@angular/common'
import { Component, Input } from '@angular/core'
import type { NotificationType } from '../../api/api.types'
import { formatDate } from '../../core/utils/formatDate'

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'app-card-notification',
    templateUrl: 'card-notification.component.html',
})
export class CardNotificationComponent {
    @Input({ required: true }) notification: null | NotificationType = null

    get notificationDate() {
        if (!this.notification) return ''
        const date = new Date(this.notification?.createdAt)
        return formatDate(date.getTime())
    }

    markAsRead(notificationId: number) {
        console.log('Marking as read:', this.notification)
    }

    deleteNotification(notificationId: number) {
        console.log('Deleting:', this.notification)
    }
}
