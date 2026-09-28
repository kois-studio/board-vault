import { CommonModule } from '@angular/common'
import { Component, Input, OnInit } from '@angular/core'
import type { NotificationType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { formatDate } from '../../core/utils/formatDate'
import { IconComponent } from '../ui/icon/icon.component'

@Component({
    imports: [CommonModule, IconComponent],
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
        if (!this.notification) return
        const notificationId = this.notification.id
        this.dataService.updateNotification(notificationId)
    }

    deleteNotification() {
        if (this.notification) {
            const notificationId = this.notification.id
            this.dataService.deleteNotification(notificationId)
        }
    }

    public iconFor(type: NotificationType['type']): string {
        return (
            {
                invitation_accepted: 'user-check',
                expulsion: 'ban',
                member_left: 'logout',
                new_games: 'gamepad',
            }[type] ?? 'info'
        )
    }
}
