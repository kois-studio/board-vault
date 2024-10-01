import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { environment } from '../../../environments/environment'

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

    constructor(private readonly router: Router) {}

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

        const endpoint = `${environment.apiUrl}auth/login`
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: this.email?.value,
                password: this.password?.value,
            }),
        }

        const response = await fetch(endpoint, options)
        const data = await response.json()

        if (response.ok) {
            this.router.navigate(['/dashboard'])
        } else {
            alert(data.message)
        }

        this.isLoading = false
    }
}
