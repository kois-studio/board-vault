import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { RouterLink } from '@angular/router'
import { Api } from '../../../api/api'
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component'
import { TitleSubtitleComponent } from '../../../components/ui/title-subtitle/title-subtitle.component'

@Component({
    imports: [CommonModule, ReactiveFormsModule, RouterLink, TitleSubtitleComponent, SpinnerComponent],
    templateUrl: 'reset-password-request.component.html',
})
export class ResetPasswordRequestComponent {
    public state: 'form' | 'loading' | 'success' = 'form'
    public errorMessage: string | null = null

    // Form inputs
    public requestResetPasswordForm = new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(128)]),
    })

    constructor(private readonly api: Api) {}

    // Getters for form controls (shorthands)
    get email() {
        return this.requestResetPasswordForm.get('email')
    }

    // Input classes
    get emailClass() {
        if (!this.email?.dirty && !this.email?.touched) return ''
        return this.email?.valid ? 'border-green-500' : 'border-red-500'
    }

    get disableSubmit(): boolean {
        return this.state === 'loading' || this.requestResetPasswordForm.invalid
    }

    onSubmit(): void {
        this.requestResetPasswordForm.markAllAsTouched()
        if (this.requestResetPasswordForm.invalid || this.state === 'loading') return

        const email = this.email?.value
        if (!email) return

        this.state = 'loading'
        this.errorMessage = null
        this.api.forgotPassword(email).subscribe({
            next: () => {
                this.state = 'success'
            },
            error: (error: unknown) => {
                this.state = 'form'
                this.errorMessage = this.getErrorMessage(error)
            },
        })
    }

    private getErrorMessage(error: unknown): string {
        const code = (error as { error?: { code?: unknown } } | null)?.error?.code
        if (code === 'EMAIL_PROVIDER_UNAVAILABLE') {
            return 'Email delivery is temporarily unavailable. Please wait a moment and try again.'
        }

        return 'We could not start the password reset. Check your connection and try again.'
    }
}
