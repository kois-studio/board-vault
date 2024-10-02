import { CommonModule } from '@angular/common'
import { Component } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'

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

    constructor(
        private readonly router: Router,
        private readonly api: Api,
        private readonly toastService: ToastService,
    ) {}

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

        if (!this.email?.value || !this.alias?.value || !this.password?.value || !this.confirmPassword?.value) {
            // should never happen due to form validation, just for ts
            this.toastService.error('Please fill in all fields')
            this.isLoading = false
            return
        }

        this.api.register(this.email?.value, this.alias?.value, this.password?.value).subscribe({
            next: (data) => {
                this.router.navigate(['/dashboard'])
            },
            error: (error) => {
                this.toastService.error('Error registering user')
            },
        })

        this.isLoading = false
    }
}
