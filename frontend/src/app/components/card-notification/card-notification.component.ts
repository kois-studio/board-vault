import { Component, computed, input } from '@angular/core'
import type { NotificationType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { formatDate } from '../../core/utils/formatDate'
import { ButtonComponent } from '../ui/button/button.component'
import { IconComponent } from '../ui/icon/icon.component'

@Component({
    imports: [ButtonComponent, IconComponent],
    selector: 'app-card-notification',
    templateUrl: 'card-notification.component.html',
})
export class CardNotificationComponent {
    readonly notification = input.required<null | NotificationType>()

    constructor(private readonly dataService: DataService) {}

    public readonly notificationDate = computed(() => {
        const notification = this.notification()
        return notification ? formatDate(new Date(notification.createdAt).getTime()) : ''
    })

    markAsRead() {
        const notification = this.notification()
        if (notification) this.dataService.updateNotification(notification.id)
    }

    deleteNotification() {
        const notification = this.notification()
        if (notification) this.dataService.deleteNotification(notification.id)
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
