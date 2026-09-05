import { Component, effect, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
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
    public readonly clerkLinkStatus = signal<string | null>(null)
    public readonly clerkLinkInProgress = signal(false)

    private checkedClerkUserId: string | null = null

    constructor() {
        effect(() => {
            const clerkUserId = this.clerkService.userId()

            if (!this.clerkService.isAvailable() || !clerkUserId || clerkUserId === this.checkedClerkUserId || this.isAuthenticated()) {
                return
            }

            this.checkedClerkUserId = clerkUserId
            void this.verifyClerkLink()
        })
    }

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
            if (!this.clerkService.isSignedIn()) {
                this.clerkLinkStatus.set('No active Clerk session was found.')
                return
            }

            const isAuthenticated = await firstValueFrom(this.loginService.verifyClerkSession())

            if (!isAuthenticated) {
                this.clerkLinkStatus.set('We could not connect this sign-in to Board Vault. Sign out and try again, or use an invitation.')
                return
            }

            this.clerkLinkStatus.set(null)
        } catch {
            this.clerkLinkStatus.set('We could not connect this sign-in to Board Vault. Sign out and try again, or use an invitation.')
        } finally {
            this.clerkLinkInProgress.set(false)
        }
    }

    public async signOutClerk(): Promise<void> {
        await this.clerkService.signOut()
        this.loginService.handleAuthErrorAndLogout()
        this.checkedClerkUserId = null
        this.clerkLinkStatus.set(null)
    }
}
