import { Component, effect } from '@angular/core'
import type { UserType } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { FormUpdateProfileComponent } from './components/form-update-profile/form-update-profile.component'
import { FormUpdateUsernameComponent } from "./components/form-update-username/form-update-username.component";
import { FormUpdateEmailComponent } from "./components/form-update-email/form-update-email.component";

@Component({
    standalone: true,
    imports: [FormUpdateProfileComponent, FormUpdateUsernameComponent, FormUpdateEmailComponent],
    selector: 'app-profile-settings',
    templateUrl: 'profile-settings.component.html',
})
export class ProfileSettingsComponent {
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
