import { Component, OnInit } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'

@Component({
    standalone: true,
    imports: [ReactiveFormsModule],
    selector: 'app-form-login',
    templateUrl: 'form-login.component.html',
})
export class FormLoginComponent implements OnInit {
    public emailControl = new FormControl('')
    public passwordControl = new FormControl('')
    public isLoading = false

    ngOnInit() {
        // add the validations required to the form controls
        this.emailControl.addValidators([Validators.required, Validators.maxLength(128)])
        this.passwordControl.addValidators([Validators.required, Validators.minLength(8), Validators.maxLength(48)])
    }

    private _validateEmail(email: string): boolean {
        const regex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/
        return regex.test(email)
    }

    public handleLogin() {
        this.isLoading = true

        if (!this.emailControl.value || !this.passwordControl.value) {
            alert('Please fill in all fields')
            this.isLoading = false
            return
        }

        if (!this._validateEmail(this.emailControl.value) || this.emailControl.value.length > 128) {
            alert('Please enter a valid email')
            this.isLoading = false
            return
        }

        if (this.passwordControl.value.length < 4 || this.passwordControl.value.length > 48) {
            alert('Password must be at least 4 characters long')
            this.isLoading = false
            return
        }

        const endpoint = '/api/auth/login'
        // const options = {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ email, password }),
        // };

        // const response = await fetch(endpoint, options);
        // const data = await response.json();

        // response.ok ? (window.location.href = `/${lang}/dashboard`) : alert(data.error);

        // return (loading = false);
    }
}
