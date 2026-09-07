import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { DarkModeToggleComponent } from '../../components/ui/dark-mode-toggle/dark-mode-toggle.component'
import { ClerkService } from '../../core/services/clerk.service'
import { LoginService } from '../../core/services/login.service'
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component'

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    imports: [RouterLink, ProfileMenuComponent, DarkModeToggleComponent, ButtonComponent],
})
export class LayoutHeaderComponent {
    private readonly loginService = inject(LoginService)
    private readonly clerkService = inject(ClerkService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // loginService
    public readonly isAuthenticated = this.loginService.isAuthenticated
    public readonly isCurrentUserAdmin = this.loginService.isCurrentUserAdmin
    public readonly clerkIsAvailable = this.clerkService.isAvailable
    public readonly selfRegistrationEnabled = this.clerkService.isSelfRegistrationEnabled
    public readonly clerkIsSignedIn = this.clerkService.isSignedIn

    public openClerkSignIn(): void {
        this.clerkService.openSignIn()
    }

    public openClerkSignUp(): void {
        this.clerkService.openSignUp()
    }
}
