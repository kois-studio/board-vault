import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import type { UserType } from '../../../../../../api/api.types'
import { DataService } from '../../../../../../core/services/data.service'

@Component({
    imports: [ReactiveFormsModule, CommonModule],
    selector: 'form-update-username',
    templateUrl: 'form-update-username.component.html',
})
export class FormUpdateUsernameComponent {
    public isEditingUsernameData = false
    public userData: UserType | null = null

    public updateUsernameFormGroup = new FormGroup({
        username: new FormControl(this.userData?.username, [Validators.required, Validators.minLength(4), Validators.maxLength(20)]),
    })

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.updateUsernameFormGroup.setValue({
                username: this.userData?.username,
            })
        })
    }

    // Form controls
    get disableSubmit() {
        const valuesAreUnchanged = this.updateUsernameFormGroup.value.username === this.userData?.username
        return this.updateUsernameFormGroup.invalid || valuesAreUnchanged
    }

    // Getters for form controls (shorthands)
    get username() {
        return this.updateUsernameFormGroup.get('username')
    }

    // Input classes
    get usernameClass() {
        if (!this.username?.dirty && !this.username?.touched) return ''
        return this.username?.valid ? 'border-green-500' : 'border-red-500'
    }

    public onCancel() {
        this.isEditingUsernameData = false
        this.updateUsernameFormGroup.setValue({
            username: this.userData?.username,
        })
    }

    public onSave() {
        const userData = this.userData
        const username = this.updateUsernameFormGroup.value.username

        if (!userData || !username) return

        this.dataService.updateCurrentUserData({ username })

        this.isEditingUsernameData = false
    }
}
