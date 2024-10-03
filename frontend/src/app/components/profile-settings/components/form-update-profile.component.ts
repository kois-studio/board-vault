import { Component, effect } from '@angular/core'
import { FormControl, FormGroup, Validators } from '@angular/forms'
import { UserService } from '../../../core/services/user.service'
import { UserType } from '../../../types/user.type'

@Component({
    standalone: true,
    imports: [],
    selector: 'form-update-profile',
    templateUrl: 'form-update-profile.component.html',
})
export class FormUpdateProfileComponent {
    public isEditingProfileData = false
    public userData: UserType | null = null

    public updateProfileFormGroup = new FormGroup({
        display_name: new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]),
        imageUrl: new FormControl('', [Validators.required]),
    })

    constructor(private readonly userService: UserService) {
        effect(() => {
            this.userData = this.userService.currentUser()
        })
    }
    public onSave() {
        console.log('saving data...')
        this.isEditingProfileData = false
    }
}
