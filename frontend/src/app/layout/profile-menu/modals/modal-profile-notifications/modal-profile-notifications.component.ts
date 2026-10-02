import { Component, inject, signal } from '@angular/core'
import { CardNotificationComponent } from '../../../../components/card-notification/card-notification.component'
import { DialogDirective } from '../../../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../../../components/ui/icon/icon.component'
import { SortByDatePipe } from '../../../../core/pipes/sortByDate.pipe'
import { DataService } from '../../../../core/services/data.service'

@Component({
    imports: [CardNotificationComponent, DialogDirective, IconComponent, SortByDatePipe],
    selector: 'app-modal-profile-notifications',
    templateUrl: 'modal-profile-notifications.component.html',
})
export class ModalProfileNotificationsComponent {
    private readonly dataService = inject(DataService)
    public readonly isVisible = signal(false)
    public readonly userNotifications = this.dataService.userNotifications
    public readonly isLoading = this.dataService.userNotificationsLoading
    public readonly hasError = this.dataService.userNotificationsError
    public showDialog() {
        this.isVisible.set(true)
    }

    public hideDialog() {
        this.isVisible.set(false)
    }

    public retry() {
        this.dataService.retryUserNotifications()
    }
}
