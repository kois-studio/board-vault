import { Component, effect } from '@angular/core'
import type { UserType } from '../../../../api/api.types'
import { DataService } from '../../../../core/services/data.service'
import { FormUpdateEmailComponent } from './forms/form-update-email/form-update-email.component'
import { FormUpdateProfileComponent } from './forms/form-update-profile/form-update-profile.component'
import { FormUpdateUsernameComponent } from './forms/form-update-username/form-update-username.component'

@Component({
    standalone: true,
    imports: [FormUpdateProfileComponent, FormUpdateUsernameComponent, FormUpdateEmailComponent],
    selector: 'app-modal-profile-settings',
    templateUrl: 'modal-profile-settings.component.html',
})
export class ModalProfileSettingsComponent {
    public isVisible = false
    public tabView = 0 // manages which tab is active
    public userData: UserType | null = null

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.userData = this.dataService.currentUser()
        })
    }

    public showDialog() {
        this.isVisible = true
    }

    public hideDialog() {
        this.isVisible = false
    }
}
