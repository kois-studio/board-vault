import { Component, effect } from '@angular/core'
import { DataService } from '../../core/services/data.service'
import type { UserType } from '../../types/user.type'
import { FormUpdateProfileComponent } from './components/form-update-profile.component'

@Component({
    standalone: true,
    imports: [FormUpdateProfileComponent],
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
