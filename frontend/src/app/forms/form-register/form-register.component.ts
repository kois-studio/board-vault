import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { environment } from '../../../environments/environment'
import { Router } from '@angular/router'

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule],
    selector: 'app-form-register',
    templateUrl: 'form-register.component.html',
})
export class FormRegisterComponent {
    public isLoading = false

    // Form inputs
    public registerFormGroup = new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(128)]),
        alias: new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]),
        password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(48)]),
        confirmPassword: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(48)]),
    })

    constructor(private readonly router: Router) {}

    // Form controls
    get disableSubmit() {
        return this.isLoading || this.registerFormGroup.invalid
    }

    // Getters for form controls (shorthands)
    get email() {
        return this.registerFormGroup.get('email')
    }
    get alias() {
        return this.registerFormGroup.get('alias')
    }
    get password() {
        return this.registerFormGroup.get('password')
    }
    get confirmPassword() {
        return this.registerFormGroup.get('confirmPassword')
    }
    get passwordsDoNotMatch() {
        return this.password?.value !== this.confirmPassword?.value
    }

    // Input classes
    get emailClass() {
        if (!this.email?.dirty && !this.email?.touched) return ''
        return this.email?.valid ? 'border-green-500' : 'border-red-500'
    }
    get aliasClass() {
        if (!this.alias?.dirty && !this.alias?.touched) return ''
        return this.alias?.valid ? 'border-green-500' : 'border-red-500'
    }
    get passwordClass() {
        if (!this.password?.dirty && !this.password?.touched) return ''
        return this.password?.valid ? 'border-green-500' : 'border-red-500'
    }
    get confirmPasswordClass() {
        if (!this.confirmPassword?.dirty && !this.confirmPassword?.touched) return ''
        return !this.passwordsDoNotMatch ? 'border-green-500' : 'border-red-500'
    }

    // Handle the user registration
    async handleRegister() {
        this.isLoading = true

        const endpoint = `${environment.apiUrl}auth/register`
        const options = {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: this.email?.value,
                alias: this.alias?.value,
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
