import { Component, inject, signal } from '@angular/core'
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms'
import { Router, RouterLink } from '@angular/router'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { ClerkService } from '../../../core/services/clerk.service'

@Component({
    templateUrl: 'register.component.html',
    imports: [ButtonComponent, RouterLink, ReactiveFormsModule, IconComponent],
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
        } catch (error) {
            this.invitationError.set(this.getInvitationErrorMessage(error))
        } finally {
            this.isInvitationSubmitting = false
        }
    }

    public async returnToPrivateBeta(): Promise<void> {
        await this.router.navigateByUrl('/register')
        this.clerkService.clearInvitationState()
    }

    private getInvitationErrorMessage(error: unknown): string {
        const errorCodes = this.getClerkErrorCodes(error)

        if (errorCodes.some((code) => /captcha|bot/.test(code))) {
            return 'The security check could not be completed. Complete it and try again.'
        }

        if (errorCodes.some((code) => /identifier|username/.test(code))) {
            return 'That username is unavailable. Choose a different username and try again.'
        }

        if (errorCodes.some((code) => /password/.test(code))) {
            return 'That password does not meet the secure sign-up requirements. Use the guidance above and try again.'
        }

        if (errorCodes.some((code) => /invitation|ticket/.test(code))) {
            return 'We could not complete this invitation. The link may have expired, been used already, or the group may no longer be available. Ask the group owner for a fresh invitation and try again.'
        }

        return 'We could not complete this invitation right now. Check the fields and security check, then try again.'
    }

    private getClerkErrorCodes(error: unknown): string[] {
        if (!error || typeof error !== 'object' || !Array.isArray((error as { errors?: unknown }).errors)) return []

        return (error as { errors: unknown[] }).errors.flatMap((entry) => {
            if (!entry || typeof entry !== 'object' || typeof (entry as { code?: unknown }).code !== 'string') return []

            return [(entry as { code: string }).code]
        })
    }
}
