import { CommonModule } from '@angular/common'
import { Component, effect, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { DataService } from '../../../core/services/data.service'
import { ButtonComponent } from "../../ui/button/button.component";

@Component({
    imports: [ReactiveFormsModule, CommonModule, ButtonComponent],
    selector: 'form-update-display-name',
    templateUrl: 'form-update-display-name.component.html',
})
export class FormUpdateDisplayNameComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    
    // --------------------------------------------------------------------------
    //        Component props
    // --------------------------------------------------------------------------
    public isEditing = false

    public updateProfileFormGroup = new FormGroup({
        displayName: new FormControl(this.currentUser$()?.displayName ?? '', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]),
    })

    constructor() {
        effect(() => {
            this.updateProfileFormGroup.setValue({
                displayName: this.currentUser$()?.displayName ?? '',
            })
        })
    }

    // Form controls
    get disableSubmit() {
        const isUnchanged = this.updateProfileFormGroup.value.displayName === this.currentUser$()?.displayName
        return this.updateProfileFormGroup.invalid || isUnchanged
    }

    // Getters for form controls (shorthands)
    get displayName() {
        return this.updateProfileFormGroup.get('displayName')
    }

    // Input classes
    get displayNameClass() {
        if (!this.displayName?.dirty && !this.displayName?.touched) return ''
        return this.displayName?.valid ? 'border-green-500' : 'border-red-500'
    }

    public onCancel() {
        this.isEditing = false
        this.updateProfileFormGroup.setValue({
            displayName: this.currentUser$()?.displayName ?? '',
        })
        this.updateProfileFormGroup.markAsUntouched()
        this.updateProfileFormGroup.markAsPristine()
    }

    public onSave() {
        const displayName = this.updateProfileFormGroup.value.displayName

        if (!displayName) return

        this.dataService.updateCurrentUserData({ displayName })

        this.isEditing = false
    }
}
