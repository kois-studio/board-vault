import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { Api } from '../../../../api/api'
import { ToastService } from '../../../../components/toast/toast.service'
import { DataService } from '../../../../core/services/data.service'
import { LocalStorageService } from '../../../../core/services/local-storage.service'

@Component({
    imports: [ReactiveFormsModule, CommonModule, RouterLink],
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
            next: (res) => {
                // Store the token in localStorage
                this.localStorageService.setToken(res.access_token)
                this.localStorageService.setItem('email', email)

                // Load the app's data
                this.dataService.init(email)
                this.toastService.success('Login successful!')
                this.router.navigate(['/dashboard'])
            },
            error: (error) => {
                this.toastService.error(error.error.message)

                // Reset the form and loading state
                this.isLoading = false
            },
        })
    }
}
