import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { environment } from '../../../environments/environment'
import { ToastComponent } from '../../components/toast/toast.component'
import { ToastService } from '../../components/toast/toast.service'
import { HttpClient } from '@angular/common/http'
import { LocalStorageService } from '../../core/services/local-storage.service'

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
        private readonly router: Router,
        private readonly http: HttpClient,
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

        const endpoint = `${environment.apiUrl}/auth/login`
        const requestBody = {
            email: this.email?.value,
            password: this.password?.value,
        }

        this.http.post<{ access_token: string }>(endpoint, requestBody).subscribe({
            next: (data) => {
                // Store the token in localStorage
                this.localStorageService.setToken(data.access_token)
                this.toastServicee.success('Login successful!')
                this.router.navigate(['/dashboard'])
            },
            error: (error) => {
                this.toastServicee.error(error.error.message)
        
                // Reset the form and loading state
                this.isLoading = false
            },
        })
    }
}
