import { Component, effect, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { DataService } from '../../../core/services/data.service'
import { ButtonComponent } from '../../ui/button/button.component'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    imports: [ReactiveFormsModule, ButtonComponent, IconComponent],
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
        displayName: new FormControl(this.currentUser$()?.displayName ?? '', [
            Validators.required,
            Validators.minLength(4),
            Validators.maxLength(20),
        ]),
    })

    constructor() {
        effect(() => {
            this.updateProfileFormGroup.setValue({
                displayName: this.currentUser$()?.displayName ?? '',
            })
        })

        // Set the form to disabled initially
        this.updateProfileFormGroup.disable()
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

        // Disable the form when canceling
        this.updateProfileFormGroup.disable()
        this._clearForm()
    }

    public onSave() {
        const displayName = this.updateProfileFormGroup.value.displayName

        if (!displayName) return

        this.dataService.updateCurrentUserData({ displayName })

        this.isEditing = false

        // Disable the form after saving
        this.updateProfileFormGroup.disable()
        this._clearForm()
    }

    private _clearForm() {
        this.updateProfileFormGroup.markAsUntouched()
        this.updateProfileFormGroup.markAsPristine()
    }

    // Watch for changes in isEditing to enable/disable the form
    public toggleEditing() {
        this.isEditing = !this.isEditing
        if (this.isEditing) {
            this.updateProfileFormGroup.enable() // Enable the form when editing
            // Focus the input element directly
            const inputElement = document.querySelector('input[formControlName="displayName"]') as HTMLInputElement
            if (inputElement) {
                inputElement.focus()
            }
        } else {
            this.updateProfileFormGroup.disable() // Disable the form when not editing
        }
    }
}
