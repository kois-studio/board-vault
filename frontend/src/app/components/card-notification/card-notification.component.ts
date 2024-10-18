import { CommonModule } from '@angular/common'
import { Component, Input, OnInit } from '@angular/core'
import type { NotificationType } from '../../api/api.types'
import { formatDate } from '../../core/utils/formatDate'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CommonModule],
    selector: 'app-card-notification',
    templateUrl: 'card-notification.component.html',
})
export class CardNotificationComponent implements OnInit {
    @Input({ required: true }) notification: null | NotificationType = null

    constructor(private readonly dataService: DataService) {}

    public notificationDate = ''

    ngOnInit() {
        if (this.notification) {
            const date = new Date(this.notification?.createdAt)
            this.notificationDate = formatDate(date.getTime())
        }
    }

    markAsRead() {
        if (!this.notification) return;
        const notificationId = this.notification.id;
        this.dataService.updateNotification(notificationId);
    }

    deleteNotification() {
        if(this.notification) {
            const notificationId = this.notification.id
            this.dataService.deleteNotification(notificationId)
        }
    }
}
