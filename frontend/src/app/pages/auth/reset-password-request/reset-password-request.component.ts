import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { TitleSubtitleComponent } from '../../../components/ui/title-subtitle/title-subtitle.component'

@Component({
    imports: [CommonModule, ReactiveFormsModule, TitleSubtitleComponent],
    templateUrl: 'reset-password-request.component.html',
})
export class ResetPasswordRequestComponent {
    // Form inputs
    public requestResetPasswordForm = new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(128)]),
    })

    // Getters for form controls (shorthands)
    get email() {
        return this.requestResetPasswordForm.get('email')
    }

    // Input classes
    get emailClass() {
        if (!this.email?.dirty && !this.email?.touched) return ''
        return this.email?.valid ? 'border-green-500' : 'border-red-500'
    }

    onSubmit() {
        if (this.requestResetPasswordForm.valid) {
            // Handle password reset logic here
            console.log('Password reset successful', this.requestResetPasswordForm.value)
        }
    }
}
