import { Component, effect } from '@angular/core'
import { Api } from '../../api/api'
import { UserService } from '../../core/services/user.service'
import { UserType } from '../../types/user.type'
import { ToastService } from '../toast/toast.service'
import { FormControl, FormGroup, Validators } from '@angular/forms'
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

    public registerFormGroup = new FormGroup({
        display_name: new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]),
        imageUrl: new FormControl('', [Validators.required])
    })

    constructor(
        private readonly api: Api,
        private readonly userService: UserService,
        private readonly toastService: ToastService,
    ) {
        effect(() => {
            this.userData = this.userService.currentUser()
        })
    }

    public showDialog() {
        this.isVisible = true
    }

    public hideDialog() {
        this.isVisible = false
    }
}
