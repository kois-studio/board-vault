import { Component, computed, ElementRef, inject, viewChild } from '@angular/core'
import { CardInvitationComponent } from '../../components/card-invitation/card-invitation.component'
import { CardNotificationComponent } from '../../components/card-notification/card-notification.component'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { SortByDatePipe } from '../../core/pipes/sortByDate.pipe'
import { DataService } from '../../core/services/data.service'
import { injectDisclosure } from '../../core/utils/disclosure'

/** The bell in the header: pending group invitations and notifications, with one count. */
@Component({
    selector: 'app-inbox',
    imports: [ButtonComponent, CardInvitationComponent, CardNotificationComponent, IconComponent, SortByDatePipe],
    templateUrl: './inbox.component.html',
})
export class InboxComponent {
    private readonly dataService = inject(DataService)
    private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger')

    public readonly disclosure = injectDisclosure(() => this.trigger())

    public readonly invitations = this.dataService.userInvitations
    public readonly invitationsLoading = this.dataService.userInvitationsLoading
    public readonly invitationsError = this.dataService.userInvitationsError
    public readonly notifications = this.dataService.userNotifications
    public readonly notificationsLoading = this.dataService.userNotificationsLoading
    public readonly notificationsError = this.dataService.userNotificationsError

    public readonly unreadCount = computed(() => this.notifications().filter((notification) => !notification.isRead).length)
    public readonly count = computed(() => this.invitations().length + this.unreadCount())
    public readonly triggerLabel = computed(() => {
        const count = this.count()
        return count ? `Inbox, ${count} new` : 'Inbox'
    })

    public markAllRead(): void {
        this.dataService.markAllNotificationsRead()
    }

    public retryInvitations(): void {
        this.dataService.retryUserInvitations()
    }

    public retryNotifications(): void {
        this.dataService.retryUserNotifications()
    }
}
