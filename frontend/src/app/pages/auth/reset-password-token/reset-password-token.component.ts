import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute } from '@angular/router'
import { RouterLink } from '@angular/router'
import { Api } from '../../../api/api'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { SpinnerComponent } from '../../../components/ui/spinner/spinner.component'
import { TitleSubtitleComponent } from '../../../components/ui/title-subtitle/title-subtitle.component'

@Component({
    imports: [SpinnerComponent, TitleSubtitleComponent, ReactiveFormsModule, RouterLink, IconComponent],
    templateUrl: 'reset-password-token.component.html',
})
export class ResetPasswordTokenComponent {
    public state: 'form' | 'loading' | 'success' | 'error' = 'form'
    public errorMessage = 'This reset link is invalid or expired. Request a fresh link to continue.'

    // Form inputs
    public resetPasswordFormGroup = new FormGroup({
        password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(48)]),
        confirmPassword: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(48)]),
    })

    constructor(
        private readonly api: Api,
        private readonly route: ActivatedRoute,
    ) {}

    // Form controls
    get disableSubmit() {
        return this.state === 'loading' || this.resetPasswordFormGroup.invalid || this.passwordsDoNotMatch
    }

    // Getters for form controls (shorthands)
    get password() {
        return this.resetPasswordFormGroup.get('password')
    }
    get confirmPassword() {
        return this.resetPasswordFormGroup.get('confirmPassword')
    }
    get passwordsDoNotMatch() {
        return this.password?.value !== this.confirmPassword?.value
    }

    // Input classes
    get passwordClass() {
        if (!this.password?.dirty && !this.password?.touched) return ''
        return this.password?.valid ? 'border-green-500' : 'border-red-500'
    }
    get confirmPasswordClass() {
        if (!this.confirmPassword?.dirty && !this.confirmPassword?.touched) return ''
        return !this.passwordsDoNotMatch ? 'border-green-500' : 'border-red-500'
    }

    public resetPassword(): void {
        this.resetPasswordFormGroup.markAllAsTouched()
        if (this.disableSubmit) return

        const token = this.route.snapshot.paramMap.get('token')
        if (!token) {
            this.state = 'error'
            return
        }

        this.state = 'loading'
        this.api.resetPassword(token, this.password?.value ?? '').subscribe({
            next: () => {
                this.state = 'success'
            },
            error: () => {
                this.state = 'error'
            },
        })
    }
}
