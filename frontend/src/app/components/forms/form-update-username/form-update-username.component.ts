import { CommonModule } from '@angular/common'
import { Component, effect, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { DataService } from '../../../core/services/data.service'
import { ButtonComponent } from '../../ui/button/button.component'
import { IconComponent } from '../../ui/icon/icon.component'

@Component({
    imports: [ReactiveFormsModule, CommonModule, ButtonComponent, IconComponent],
    selector: 'form-update-username',
    templateUrl: 'form-update-username.component.html',
})
export class FormUpdateUsernameComponent {
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

    public updateUsernameFormGroup = new FormGroup({
        username: new FormControl(this.currentUser$()?.username, [Validators.required, Validators.minLength(4), Validators.maxLength(20)]),
    })

    constructor() {
        effect(() => {
            this.updateUsernameFormGroup.setValue({
                username: this.currentUser$()?.username ?? '',
            })
        })

        // Set the form to disabled initially
        this.updateUsernameFormGroup.disable()
    }

    // Form controls
    get disableSubmit() {
        const isUnchanged = this.updateUsernameFormGroup.value.username === this.currentUser$()?.username
        return this.updateUsernameFormGroup.invalid || isUnchanged
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
        this.isEditing = false
        this.updateUsernameFormGroup.setValue({
            username: this.currentUser$()?.username ?? '',
        })

        // Disable the form when canceling
        this.updateUsernameFormGroup.disable()
        this._clearForm()
    }

    public onSave() {
        const username = this.updateUsernameFormGroup.value.username

        if (!username) return

        this.dataService.updateCurrentUserData({ username })

        this.isEditing = false

        // Disable the form after saving
        this.updateUsernameFormGroup.disable()
        this._clearForm()
    }

    private _clearForm() {
        this.updateUsernameFormGroup.markAsUntouched()
        this.updateUsernameFormGroup.markAsPristine()
    }

    // Watch for changes in isEditing to enable/disable the form
    public toggleEditing() {
        this.isEditing = !this.isEditing
        if (this.isEditing) {
            this.updateUsernameFormGroup.enable() // Enable the form when editing
            // Focus the input element directly
            const inputElement = document.querySelector('input[formControlName="username"]') as HTMLInputElement
            if (inputElement) {
                inputElement.focus()
            }
        } else {
            this.updateUsernameFormGroup.disable() // Disable the form when not editing
        }
    }
}
