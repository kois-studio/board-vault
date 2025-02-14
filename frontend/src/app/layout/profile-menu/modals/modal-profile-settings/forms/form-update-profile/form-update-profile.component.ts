import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import type { UserType } from '../../../../../../api/api.types'
import { DataService } from '../../../../../../core/services/data.service'
import { urlValidator } from '../../../../../../core/validators/url.validator'

@Component({
    imports: [ReactiveFormsModule, CommonModule, FormUpdateProfileComponent],
    selector: 'form-update-profile',
    templateUrl: 'form-update-profile.component.html',
})
export class FormUpdateProfileComponent {
    public isEditingProfileData = false
    public userData: UserType | null = null

    public updateProfileFormGroup = new FormGroup({
        displayName: new FormControl(this.userData?.displayName, [Validators.required, Validators.minLength(4), Validators.maxLength(20)]),
        imageUrl: new FormControl(this.userData?.imageUrl, [Validators.required, urlValidator()]),
    })

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.updateProfileFormGroup.setValue({
                displayName: this.userData?.displayName,
                imageUrl: this.userData?.imageUrl,
            })
        })
    }

    // Form controls
    get disableSubmit() {
        const valuesAreUnchanged =
            this.updateProfileFormGroup.value.displayName === this.userData?.displayName &&
            this.updateProfileFormGroup.value.imageUrl === this.userData?.imageUrl
        return this.updateProfileFormGroup.invalid || valuesAreUnchanged
    }

    // Getters for form controls (shorthands)
    get displayName() {
        return this.updateProfileFormGroup.get('displayName')
    }
    get imageUrl() {
        return this.updateProfileFormGroup.get('imageUrl')
    }

    // Input classes
    get displayNameClass() {
        if (!this.displayName?.dirty && !this.displayName?.touched) return ''
        return this.displayName?.valid ? 'border-green-500' : 'border-red-500'
    }
    get imageUrlClass() {
        if (!this.imageUrl?.dirty && !this.imageUrl?.touched) return ''
        return this.imageUrl?.valid ? 'border-green-500' : 'border-red-500'
    }

    public onCancel() {
        this.isEditingProfileData = false
        this.updateProfileFormGroup.setValue({
            displayName: this.userData?.displayName,
            imageUrl: this.userData?.imageUrl,
        })
    }

    public onSave() {
        const userData = this.userData
        const displayName = this.updateProfileFormGroup.value.displayName
        const imageUrl = this.updateProfileFormGroup.value.imageUrl

        if (!userData || !displayName || !imageUrl) return

        this.dataService.updateCurrentUserData({ displayName, imageUrl })

        this.isEditingProfileData = false
    }
}
