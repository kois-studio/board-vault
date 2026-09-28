import { Component, inject } from '@angular/core'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { SpinnerComponent } from '../../components/ui/spinner/spinner.component'
import { ClerkService } from '../../core/services/clerk.service'
import { LoginService } from '../../core/services/login.service'

@Component({
    selector: 'app-auth-handoff',
    templateUrl: './auth-handoff.component.html',
    imports: [ButtonComponent, SpinnerComponent, IconComponent],
})
export class AuthHandoffComponent {
    private readonly loginService = inject(LoginService)
    private readonly clerkService = inject(ClerkService)

    public readonly state = this.loginService.clerkAuthHandoffState
    public readonly error = this.loginService.clerkAuthHandoffError
    public readonly isInvitationFlow = this.clerkService.isInvitationFlow

    public retry(): void {
        this.loginService.retryClerkSession()
    }

    public async signOut(): Promise<void> {
        await this.loginService.signOutClerk()
    }
}
