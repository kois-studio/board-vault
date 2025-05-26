import { CommonModule } from '@angular/common'
import { Component, inject } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { Api } from '../../../../api/api'
import { ToastService } from '../../../../components/toast/toast.service'
import { ButtonComponent } from '../../../../components/ui/button/button.component'
import { DataService } from '../../../../core/services/data.service'
import { LocalStorageService } from '../../../../core/services/local-storage.service'
import { LogService } from '../../../../core/services/log.service'
import { LoginService } from '../../../../core/services/login.service'

@Component({
    imports: [ReactiveFormsModule, CommonModule, RouterLink, ButtonComponent],
    selector: 'app-form-login',
    templateUrl: 'form-login.component.html',
})
export class FormLoginComponent {
    private readonly logger = inject(LogService)
    private readonly loginService = inject(LoginService)

    public isLoading = false

    // Form inputs
    public loginFormGroup = new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(128)]),
        password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(48)]),
    })

    constructor(
        private readonly api: Api,
        private readonly router: Router,
        private readonly dataService: DataService,
        private readonly toastService: ToastService,
        private readonly localStorageService: LocalStorageService,
    ) {}

    // Form controls
    get disableSubmit() {
        return this.isLoading || this.loginFormGroup.invalid
    }

    // Getters for form controls (shorthands)
    get email() {
        return this.loginFormGroup.get('email')
    }
    get password() {
        return this.loginFormGroup.get('password')
    }

    // Input classes
    get emailClass() {
        if (!this.email?.dirty && !this.email?.touched) return ''
        return this.email?.valid ? 'border-green-500' : 'border-red-500'
    }
    get passwordClass() {
        if (!this.password?.dirty && !this.password?.touched) return ''
        return this.password?.valid ? 'border-green-500' : 'border-red-500'
    }

    // Handle the user login
    async handleLogin() {
        this.isLoading = true
        const email = this.email?.value
        const password = this.password?.value

        if (!email || !password) {
            // should never happen due to form validation, just for ts
            this.toastService.error('Please fill in all fields')
            this.isLoading = false
            return
        }

        this.api.login(email, password).subscribe({
            // api.login returns Observable<LoginApiResponse>
            next: (response) => {
                this.logger.log('Login API call successful, token received.')

                // 1. Store the token using the LoginService setter
                this.loginService.token = response.access_token

                // 2. Now, trigger the standard token verification and user data fetching flow
                //    This will call /auth/status, set signals, and initiate DataService loading.
                this.loginService.verifyTokenAndFetchUserData().subscribe({
                    next: (isAuthenticatedAndDataFetched) => {
                        if (isAuthenticatedAndDataFetched) {
                            this.toastService.success('Login successful!')
                            this.router
                                .navigate(['/dashboard'])
                                .then(() => {
                                    this.isLoading = false
                                })
                                .catch((navError) => {
                                    this.logger.error('Navigation error after login:', navError)
                                    this.isLoading = false
                                })
                        } else {
                            // This case should ideally be handled within verifyTokenAndFetchUserData
                            // (e.g., by navigating to login or showing a generic error).
                            // If it reaches here, it means /auth/status failed for the new token,
                            // which would be unusual but possible.
                            this.toastService.error('Login succeeded but failed to initialize session. Please try again.')
                            this.isLoading = false
                            // LoginService should have cleared the bad token already.
                        }
                    },
                    error: (verificationError) => {
                        // This error is from verifyTokenAndFetchUserData itself,
                        // which should be rare if the API call within it is caught.
                        this.logger.error('Error during post-login verification step:', verificationError)
                        this.toastService.error('An unexpected error occurred after login. Please try again.')
                        this.isLoading = false
                    },
                })
            },
            error: (apiError) => {
                const message = apiError?.error?.message || apiError?.message || 'Login failed. Please check your credentials.'
                this.toastService.error(message)
                this.logger.error('Login API error:', apiError)
                this.isLoading = false
            },
        })
    }
}
