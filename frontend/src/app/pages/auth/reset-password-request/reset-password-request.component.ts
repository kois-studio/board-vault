import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Api } from '../../../api/api'
import { ToastService } from '../../../components/toast/toast.service'
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component'
import { TitleSubtitleComponent } from '../../../components/ui/title-subtitle/title-subtitle.component'

@Component({
    imports: [CommonModule, ReactiveFormsModule, TitleSubtitleComponent, SpinnerComponent],
    templateUrl: 'reset-password-request.component.html',
})
export class ResetPasswordRequestComponent {
    public state: 'form' | 'loading' | 'success' = 'form'

    // Form inputs
    public requestResetPasswordForm = new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(128)]),
    })

    constructor(
        private readonly api: Api,
        private readonly toastService: ToastService,
    ) {}

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
            const email = this.email?.value
            if (!email) return

            this.state = 'loading'
            setTimeout(() => {
                this.api.forgotPassword(email).subscribe({
                    next: () => {
                        this.toastService.success('Password reset email sent')
                        this.state = 'success'
                    },
                    error: () => {
                        this.toastService.error('Failed to send password reset email')
                        this.state = 'form'
                    },
                })
            }, 1000)
        }
    }
}
