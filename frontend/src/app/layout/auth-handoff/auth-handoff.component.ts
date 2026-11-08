import { afterNextRender, Component, ElementRef, effect, Injector, inject, input, viewChild } from '@angular/core'
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
    private readonly injector = inject(Injector)

    public readonly state = this.loginService.clerkAuthHandoffState
    public readonly error = this.loginService.clerkAuthHandoffError
    public readonly isInvitationFlow = this.clerkService.isInvitationFlow
    public readonly isReconnecting = this.loginService.isReconnecting

    /** True in layouts without a header and footer (focused pages), so the screen fills the whole height. */
    public readonly fillsViewport = input(false)

    private readonly retryButton = viewChild('retryButton', { read: ElementRef<HTMLButtonElement> })
    private focusRetryWhenDone = false

    constructor() {
        // The button is disabled while it tries, which drops keyboard focus; put it back when the try fails.
        effect(() => {
            if (this.isReconnecting() || !this.focusRetryWhenDone) return
            this.focusRetryWhenDone = false
            afterNextRender(() => this.retryButton()?.nativeElement.focus(), { injector: this.injector })
        })
    }

    public retry(): void {
        this.focusRetryWhenDone = this.state() === 'unavailable'
        this.loginService.retryClerkSession()
    }

    public async signOut(): Promise<void> {
        await this.loginService.signOutClerk()
    }
}
