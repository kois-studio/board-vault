import { Component, computed, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { NotificationType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { formatDate } from '../../core/utils/formatDate'
import { ButtonComponent } from '../ui/button/button.component'
import { IconComponent } from '../ui/icon/icon.component'

@Component({
    imports: [ButtonComponent, IconComponent, RouterLink],
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

    /** Where the notification leads, when it is about something that has a page. */
    public readonly link = computed<{ path: Array<string | number>; label: string } | null>(() => {
        const notification = this.notification()
        if (!notification) return null
        const createdGameId = notification.data?.['createdGameId']
        if (notification.type === 'game_proposal_approved' && typeof createdGameId === 'number') {
            return { path: ['/games', createdGameId], label: 'Open the game' }
        }
        if (notification.type === 'game_proposal_submitted') {
            return { path: ['/admin', 'proposals'], label: 'Review proposals' }
        }
        return null
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
                game_proposal_submitted: 'lightbulb',
                game_proposal_approved: 'circle-check',
                game_proposal_rejected: 'circle-x',
            }[type] ?? 'info'
        )
    }
}
