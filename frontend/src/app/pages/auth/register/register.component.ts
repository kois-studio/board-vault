import { Component, inject, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { ClerkService } from '../../../core/services/clerk.service'
import { FormRegisterComponent } from './form-register/form-register.component'

@Component({
    templateUrl: 'register.component.html',
    imports: [RouterLink, ReactiveFormsModule, FormRegisterComponent],
})
export class RegisterComponent {
    private readonly clerkService = inject(ClerkService)
    private readonly router = inject(Router)

    public readonly clerkIsConfigured = this.clerkService.isConfigured
    public readonly clerkIsAvailable = this.clerkService.isAvailable
    public readonly selfRegistrationEnabled = this.clerkService.isSelfRegistrationEnabled
    public readonly isInvitationFlow = this.clerkService.isInvitationFlow
    public readonly isInvitationSignIn = this.clerkService.isInvitationSignIn
    public readonly invitationError = signal<string | null>(null)

    public readonly invitationForm = new FormGroup({
        username: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.minLength(4), Validators.maxLength(64)],
        }),
        password: new FormControl('', {
            nonNullable: true,
            validators: [Validators.required, Validators.minLength(15), Validators.maxLength(128)],
        }),
        confirmPassword: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    })
    public isInvitationSubmitting = false

    public openClerkSignUp(): void {
        this.clerkService.openSignUp()
    }

    public get invitationPasswordsMatch(): boolean {
        return this.invitationForm.controls.password.value === this.invitationForm.controls.confirmPassword.value
    }

    public async completeInvitationSignUp(): Promise<void> {
        this.invitationForm.markAllAsTouched()
        if ((!this.isInvitationSignIn() && (this.invitationForm.invalid || !this.invitationPasswordsMatch)) || this.isInvitationSubmitting)
            return

        this.isInvitationSubmitting = true
        this.invitationError.set(null)

        try {
            await this.clerkService.completeInvitationSignUp(
                this.isInvitationSignIn() ? '' : this.invitationForm.controls.username.value,
                this.isInvitationSignIn() ? '' : this.invitationForm.controls.password.value,
            )
            await this.router.navigateByUrl('/dashboard')
        } catch {
            this.invitationError.set('This invitation could not be completed. Ask the group owner to send a fresh link and try again.')
        } finally {
            this.isInvitationSubmitting = false
        }
    }
}
