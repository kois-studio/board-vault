import { CommonModule } from '@angular/common'
import { Component, Input, OnInit } from '@angular/core'
import type { NotificationType } from '../../api/api.types'
import { formatDate } from '../../core/utils/formatDate'

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'app-card-notification',
    templateUrl: 'card-notification.component.html',
})
export class CardNotificationComponent implements OnInit {
    @Input({ required: true }) notification: null | NotificationType = null

    public notificationDate = ''

    ngOnInit() {
        if (this.notification) {
            const date = new Date(this.notification?.createdAt)
            this.notificationDate = formatDate(date.getTime())
        }
    }

    markAsRead(notificationId: number) {
        console.log('Marking as read:', this.notification)
    }

    deleteNotification(notificationId: number) {
        console.log('Deleting:', this.notification)
    }
}
