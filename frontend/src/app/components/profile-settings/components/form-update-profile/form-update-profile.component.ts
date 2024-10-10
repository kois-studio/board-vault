import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { UserType } from '../../../../api/api.types'
import { DataService } from '../../../../core/services/data.service'
import { urlValidator } from '../../../../core/validators/url.validator'

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule, FormUpdateProfileComponent],
    selector: 'form-update-profile',
    templateUrl: 'form-update-profile.component.html',
})
export class FormUpdateProfileComponent {
    public isEditingProfileData = false
    public userData: UserType | null = null

    public updateProfileFormGroup = new FormGroup({
        display_name: new FormControl(this.userData?.display_name, [
            Validators.required,
            Validators.minLength(4),
            Validators.maxLength(20),
        ]),
        imageUrl: new FormControl(this.userData?.imageUrl, [Validators.required, urlValidator()]),
    })

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.updateProfileFormGroup.setValue({
                display_name: this.userData?.display_name,
                imageUrl: this.userData?.imageUrl,
            })
        })
    }

    // Form controls
    get disableSubmit() {
        const valuesAreUnchanged =
            this.updateProfileFormGroup.value.display_name === this.userData?.display_name &&
            this.updateProfileFormGroup.value.imageUrl === this.userData?.imageUrl
        return this.updateProfileFormGroup.invalid || valuesAreUnchanged
    }

    // Getters for form controls (shorthands)
    get display_name() {
        return this.updateProfileFormGroup.get('display_name')
    }
    get imageUrl() {
        return this.updateProfileFormGroup.get('imageUrl')
    }

    // Input classes
    get displayNameClass() {
        if (!this.display_name?.dirty && !this.display_name?.touched) return ''
        return this.display_name?.valid ? 'border-green-500' : 'border-red-500'
    }
    get imageUrlClass() {
        if (!this.imageUrl?.dirty && !this.imageUrl?.touched) return ''
        return this.imageUrl?.valid ? 'border-green-500' : 'border-red-500'
    }

    public onCancel() {
        this.isEditingProfileData = false
        this.updateProfileFormGroup.setValue({
            display_name: this.userData?.display_name,
            imageUrl: this.userData?.imageUrl,
        })
    }

    public onSave() {
        const userData = this.userData
        const display_name = this.updateProfileFormGroup.value.display_name
        const imageUrl = this.updateProfileFormGroup.value.imageUrl

        if (!userData || !display_name || !imageUrl) return

        this.dataService.updateCurrentUserData({ display_name, imageUrl })

        this.isEditingProfileData = false
    }
}
