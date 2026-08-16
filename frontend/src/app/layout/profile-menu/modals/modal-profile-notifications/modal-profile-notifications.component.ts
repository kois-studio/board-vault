import { Component, inject } from '@angular/core'
import { CardNotificationComponent } from '../../../../components/card-notification/card-notification.component'
import { SortByDatePipe } from '../../../../core/pipes/sortByDate.pipe'
import { DataService } from '../../../../core/services/data.service'

@Component({
    imports: [CardNotificationComponent, SortByDatePipe],
    selector: 'app-modal-profile-notifications',
    templateUrl: 'modal-profile-notifications.component.html',
})
export class ModalProfileNotificationsComponent {
    private readonly dataService = inject(DataService)
    public isVisible = false
    public readonly userNotifications = this.dataService.userNotifications
    public readonly isLoading = this.dataService.userNotificationsLoading
    public readonly hasError = this.dataService.userNotificationsError

    public showDialog() {
        this.isVisible = true
    }

    public hideDialog() {
        this.isVisible = false
    }

    public retry() {
        this.dataService.retryUserNotifications()
    }
}
