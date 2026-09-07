import { Component, inject } from '@angular/core'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { SpinnerComponent } from '../../components/ui/spinner/spinner.component'
import { LoginService } from '../../core/services/login.service'

@Component({
    selector: 'app-auth-handoff',
    templateUrl: './auth-handoff.component.html',
    imports: [ButtonComponent, SpinnerComponent],
})
export class AuthHandoffComponent {
    private readonly loginService = inject(LoginService)

    public readonly state = this.loginService.clerkAuthHandoffState
    public readonly error = this.loginService.clerkAuthHandoffError

    public retry(): void {
        this.loginService.retryClerkSession()
    }

    public async signOut(): Promise<void> {
        await this.loginService.signOutClerk()
    }
}
