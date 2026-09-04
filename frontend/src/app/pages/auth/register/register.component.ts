import { Component, effect, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ClerkService } from '../../../core/services/clerk.service'
import { FormRegisterComponent } from './form-register/form-register.component'

@Component({
    templateUrl: 'register.component.html',
    imports: [RouterLink, FormRegisterComponent],
})
export class RegisterComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly clerkIsAvailable = this.clerkService.isAvailable
    public readonly selfRegistrationEnabled = this.clerkService.isSelfRegistrationEnabled
    public readonly isInvitationFlow = this.clerkService.isInvitationFlow
    public readonly invitationError = signal<string | null>(null)

    private invitationOpened = false

    constructor() {
        effect(() => {
            if (!this.isInvitationFlow() || !this.clerkIsAvailable() || this.invitationOpened) {
                return
            }

            this.invitationOpened = true
            void this.beginInvitationSignUp()
        })
    }

    public openClerkSignUp(): void {
        if (this.isInvitationFlow()) {
            void this.beginInvitationSignUp()
            return
        }

        this.clerkService.openSignUp()
    }

    private async beginInvitationSignUp(): Promise<void> {
        this.invitationError.set(null)

        try {
            await this.clerkService.beginInvitationSignUp()
        } catch {
            this.invitationError.set('This invitation is invalid or expired. Ask the group owner to send a new one.')
            this.invitationOpened = false
        }
    }
}
