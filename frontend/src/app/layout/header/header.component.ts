import { Component, HostListener, inject, signal } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { DarkModeToggleComponent } from '../../components/ui/dark-mode-toggle/dark-mode-toggle.component'
import { IconComponent } from '../../components/ui/icon/icon.component'
import { ClerkService } from '../../core/services/clerk.service'
import { LoginService } from '../../core/services/login.service'
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component'

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    imports: [RouterLink, ProfileMenuComponent, DarkModeToggleComponent, ButtonComponent, IconComponent],
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
    public readonly isMobileNavigationOpen = signal(false)

    public readonly mobileNavigation = [
        { path: '/dashboard', label: 'Home', icon: 'house' },
        { path: '/groups', label: 'Groups', icon: 'users' },
        { path: '/collection/games', label: 'My shelf', icon: 'library' },
        { path: '/play', label: 'Play', icon: 'dice' },
        { path: '/play/history', label: 'Memories', icon: 'clock' },
        { path: '/settings', label: 'Settings', icon: 'settings' },
    ]

    public readonly mobilePublicNavigation = [
        { path: '/#features', label: 'Features', icon: 'sparkles' },
        { path: '/#how-it-works', label: 'How it works', icon: 'list' },
        { path: '/login', label: 'Log in', icon: 'log-in' },
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
