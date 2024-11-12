import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import type { UserType } from '../../../../../../api/api.types'
import { DataService } from '../../../../../../core/services/data.service'
import { LocalStorageService } from '../../../../../../core/services/local-storage.service'

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule, FormUpdateEmailComponent],
    selector: 'form-update-email',
    templateUrl: 'form-update-email.component.html',
})
export class FormUpdateEmailComponent {
    public isEditingEmailData = false
    public userData: UserType | null = null

    public updateEmailFormGroup = new FormGroup({
        email: new FormControl(this.userData?.email, [Validators.required, Validators.email, Validators.maxLength(128)]),
    })

    constructor(
        private readonly dataService: DataService,
        private readonly router: Router,
        private readonly localStorageService: LocalStorageService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.updateEmailFormGroup.setValue({
                email: this.userData?.email,
            })
        })
    }

    // Form controls
    get disableSubmit() {
        const valuesAreUnchanged = this.updateEmailFormGroup.value.email === this.userData?.email
        return this.updateEmailFormGroup.invalid || valuesAreUnchanged
    }

    // Getters for form controls (shorthands)
    get email() {
        return this.updateEmailFormGroup.get('email')
    }

    // Input classes
    get emailClass() {
        if (!this.email?.dirty && !this.email?.touched) return ''
        return this.email?.valid ? 'border-green-500' : 'border-red-500'
    }

    public onCancel() {
        this.isEditingEmailData = false
        this.updateEmailFormGroup.setValue({
            email: this.userData?.email,
        })
    }

    public onSave() {
        const userData = this.userData
        const email = this.updateEmailFormGroup.value.email

        if (!userData || !email) return

        this.dataService.updateCurrentUserData({ email })

        this.localStorageService.deleteToken()
        this.dataService.clearState()
        this.router.navigate(['/login'])

        this.isEditingEmailData = false
    }
}
