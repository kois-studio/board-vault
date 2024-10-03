import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { LocalStorageService } from '../../core/services/local-storage.service'
import { UserService } from '../../core/services/user.service'

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule],
    selector: 'app-form-login',
    templateUrl: 'form-login.component.html',
})
export class FormLoginComponent {
    public isLoading = false

    // Form inputs
    public loginFormGroup = new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(128)]),
        password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(48)]),
    })

    constructor(
        private readonly api: Api,
        private readonly router: Router,
        private readonly userService: UserService,
        private readonly toastServicee: ToastService,
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
            this.toastServicee.error('Please fill in all fields')
            this.isLoading = false
            return
        }

        this.api.login(email, password).subscribe({
            next: (data) => {
                // Store the token in localStorage
                this.localStorageService.setToken(data.access_token)
                if (email) {
                    this.localStorageService.setItem('email', email)
                }

                // Fetch the user data
                this.api.getUserByEmail(email).subscribe({
                    next: (res) => {
                        this.userService.setCurrentUser(res.data)
                        this.toastServicee.success('Login successful!')
                        this.router.navigate(['/dashboard'])
                    },
                    error: (error) => {
                        this.toastServicee.error("Error retrieving user's data")
                    },
                })
            },
            error: (error) => {
                this.toastServicee.error(error.error.message)

                // Reset the form and loading state
                this.isLoading = false
            },
        })
    }
}
