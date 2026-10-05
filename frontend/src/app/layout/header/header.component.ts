import { Component, computed, effect, HostListener, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { NavigationEnd, Router, RouterLink } from '@angular/router'
import { filter, map } from 'rxjs/operators'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { LogoComponent } from '../../components/ui/logo/logo.component'
import { ClerkService } from '../../core/services/clerk.service'
import { LoginService } from '../../core/services/login.service'
import { PendingProposalsService } from '../../core/services/pending-proposals.service'
import { APP_SECTIONS, activeSectionFor } from '../app-sections'
import { InboxComponent } from '../inbox/inbox.component'
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component'

/**
 * One bar. Signed in: logo, the main sections (desktop; phones use the bottom tab bar), inbox, avatar menu.
 * Signed out: logo, landing anchors, log in and the call to action.
 */
@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    imports: [LogoComponent, RouterLink, ProfileMenuComponent, InboxComponent, ButtonComponent, IconComponent],
})
export class LayoutHeaderComponent {
    private readonly loginService = inject(LoginService)
    private readonly clerkService = inject(ClerkService)
    private readonly pendingProposals = inject(PendingProposalsService)
    private readonly router = inject(Router)

    public readonly isAuthenticated = this.loginService.isAuthenticated
    public readonly isCurrentUserAdmin = this.loginService.isCurrentUserAdmin
    public readonly clerkIsAvailable = this.clerkService.isAvailable
    public readonly selfRegistrationEnabled = this.clerkService.isSelfRegistrationEnabled
    public readonly clerkIsSignedIn = this.clerkService.isSignedIn
    public readonly isMobileNavigationOpen = signal(false)

    public readonly sections = APP_SECTIONS
    private readonly url = toSignal(
        this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map((event) => event.urlAfterRedirects),
        ),
        { initialValue: this.router.url },
    )
    public readonly activeSection = computed(() => activeSectionFor(this.url()))

    constructor() {
        // Admins see how many game proposals are waiting in the avatar menu.
        effect(() => {
            if (this.isAuthenticated() && this.isCurrentUserAdmin()) void this.pendingProposals.refresh()
            else this.pendingProposals.clear()
        })
    }

    public readonly mobilePublicNavigation = [
        { path: '/#features', label: 'Features', icon: 'sparkle' },
        { path: '/#how-it-works', label: 'How it works', icon: 'file-text' },
        { path: '/login', label: 'Log in', icon: 'arrow-right' },
        { path: '/register', label: 'Private beta', icon: 'mail' },
    ]

    public openClerkSignIn(): void {
        this.clerkService.openSignIn()
    }

    public openClerkSignUp(): void {
        this.clerkService.openSignUp()
    }

    public toggleMobileNavigation(): void {
        this.isMobileNavigationOpen.update((isOpen) => !isOpen)
    }

    public closeMobileNavigation(): void {
        this.isMobileNavigationOpen.set(false)
    }

    @HostListener('document:keydown.escape')
    public closeMobileNavigationOnEscape(): void {
        this.closeMobileNavigation()
    }
}
