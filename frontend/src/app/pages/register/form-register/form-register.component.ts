import { CommonModule } from '@angular/common'
import { Component, OnInit } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router } from '@angular/router'
import { debounceTime, distinctUntilChanged, switchMap } from 'rxjs'
import { Api } from '../../../api/api'
import { ToastService } from '../../../components/toast/toast.service'

@Component({
    standalone: true,
    imports: [ReactiveFormsModule, CommonModule],
    selector: 'app-form-register',
    templateUrl: 'form-register.component.html',
})
export class FormRegisterComponent implements OnInit {
    public isLoading = false

    // email availability check
    public isCheckingEmail = false
    public isEmailAvailable: boolean | null = null

    // username availability check
    public isCheckingUsername = false
    public isUsernameAvailable: boolean | null = null

    // Form inputs
    public registerFormGroup = new FormGroup({
        email: new FormControl('', [Validators.required, Validators.email, Validators.maxLength(128)]),
        username: new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(20)]),
        password: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(48)]),
        confirmPassword: new FormControl('', [Validators.required, Validators.minLength(8), Validators.maxLength(48)]),
    })

    constructor(
        private readonly router: Router,
        private readonly api: Api,
        private readonly toastService: ToastService,
    ) {}

    ngOnInit() {
        // Check email availability when the user types
        this.email?.valueChanges
            .pipe(
                debounceTime(300), // Wait for 300ms after the user stops typing
                distinctUntilChanged(), // Only call the API if the value actually changes
                switchMap((email) => {
                    if (!email || this.email?.invalid) return []
                    return this.api.checkEmail(email)
                })
            )
            .subscribe({
                next: (response) => {
                    this.isCheckingEmail = false
                    this.isEmailAvailable = response.isAvailable
                },
                error: () => {
                    this.isCheckingEmail = false
                    this.isEmailAvailable = null
                    this.toastService.error('Error checking email availability')
                },
            })

        // Check username availability when the user types
        this.username?.valueChanges
            .pipe(
                debounceTime(300), // Wait for 300ms after the user stops typing
                distinctUntilChanged(), // Only call the API if the value actually changes
                switchMap((username) => {
                    if (!username || this.username?.invalid) {
                        this.isCheckingUsername = false
                        this.isUsernameAvailable = null
                        return []
                    }
                    this.isCheckingUsername = true
                    this.isUsernameAvailable = null
                    return this.api.checkUsername(username)
                })
            )
            .subscribe({
                next: (response) => {
                    this.isCheckingUsername = false
                    this.isUsernameAvailable = response.isAvailable
                },
                error: () => {
                    this.isCheckingUsername = false
                    this.isUsernameAvailable = null
                    this.toastService.error('Error checking username availability')
                }
            })
    }

    // Form controls
    get disableSubmit() {
        return this.isLoading || this.registerFormGroup.invalid
    }

    // Getters for form controls (shorthands)
    get email() {
        return this.registerFormGroup.get('email')
    }
    get username() {
        return this.registerFormGroup.get('username')
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
    get usernameClass() {
        if (!this.username?.dirty && !this.username?.touched) return ''
        if (this.isCheckingUsername) return 'border-gray-500' // While checking, use a neutral border
        if (this.isUsernameAvailable) return 'border-green-500'
        if (!this.isUsernameAvailable) return 'border-red-500'
        return this.username?.valid ? 'border-green-500' : 'border-red-500'
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

        if (!this.email?.value || !this.username?.value || !this.password?.value || !this.confirmPassword?.value) {
            // should never happen due to form validation, just for ts
            this.toastService.error('Please fill in all fields')
            this.isLoading = false
            return
        }

        this.api.register(this.email?.value, this.username?.value, this.password?.value).subscribe({
            next: (data) => {
                this.toastService.success('User registered successfully!')
                this.router.navigate(['/login'])
            },
            error: (error) => {
                this.toastService.error('Error registering user')
            },
        })

        this.isLoading = false
    }
}
