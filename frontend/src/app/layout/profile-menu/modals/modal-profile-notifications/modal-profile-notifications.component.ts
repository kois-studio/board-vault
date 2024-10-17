import { Component, effect } from '@angular/core'
import { CardNotificationComponent } from '../../../../components/card-notification/card-notification.component'
import { SortByDatePipe } from '../../../../core/pipes/sortByDate.pipe'
import { DataService } from '../../../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CardNotificationComponent, SortByDatePipe],
    selector: 'app-modal-profile-notifications',
    templateUrl: 'modal-profile-notifications.component.html',
})
export class ModalProfileNotificationsComponent {
    public isVisible = false
    public userNotifications: ReturnType<typeof this.dataService.userNotifications> = []

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.userNotifications = this.dataService.userNotifications()
        })
    }

    public showDialog() {
        this.isVisible = true
    }

    public hideDialog() {
        this.isVisible = false
    }
}
