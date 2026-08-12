import { Component, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
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
    private readonly api = inject(Api)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // loginService
    public readonly isAuthenticated = this.loginService.isAuthenticated
    public readonly isCurrentUserAdmin = this.loginService.isCurrentUserAdmin
    public readonly clerkIsConfigured = this.clerkService.isConfigured
    public readonly clerkIsLoaded = this.clerkService.isLoaded
    public readonly clerkIsSignedIn = this.clerkService.isSignedIn
    public readonly clerkLinkStatus = signal<string | null>(null)
    public readonly clerkLinkedAccountId = signal<number | null>(null)
    public readonly clerkLinkInProgress = signal(false)

    public openClerkSignIn(): void {
        this.clerkLinkStatus.set(null)
        this.clerkService.openSignIn()
    }

    public openClerkSignUp(): void {
        this.clerkLinkStatus.set(null)
        this.clerkService.openSignUp()
    }

    public async verifyClerkLink(): Promise<void> {
        this.clerkLinkInProgress.set(true)
        this.clerkLinkStatus.set(null)

        try {
            const token = await this.clerkService.getToken()

            if (!token) {
                this.clerkLinkStatus.set('No active Clerk session was found.')
                return
            }

            const response = await firstValueFrom(this.api.clerkAuthStatus(token))
            this.clerkLinkedAccountId.set(response.userId)
            this.clerkLinkStatus.set(`Linked to local Board Vault account #${response.userId}.`)
        } catch (error: unknown) {
            const message =
                error &&
                typeof error === 'object' &&
                'error' in error &&
                error.error &&
                typeof error.error === 'object' &&
                'message' in error.error &&
                typeof error.error.message === 'string'
                    ? error.error.message
                    : null
            this.clerkLinkStatus.set(message || 'The Clerk session could not be linked to a local account.')
        } finally {
            this.clerkLinkInProgress.set(false)
        }
    }

    public async signOutClerk(): Promise<void> {
        await this.clerkService.signOut()
        this.clerkLinkStatus.set(null)
        this.clerkLinkedAccountId.set(null)
    }
}
