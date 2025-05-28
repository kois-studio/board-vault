import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ButtonComponent } from '../../components/ui/button/button.component'
import { DarkModeToggleComponent } from '../../components/ui/dark-mode-toggle/dark-mode-toggle.component'
import { LoginService } from '../../core/services/login.service'
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component'

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    imports: [RouterLink, ProfileMenuComponent, DarkModeToggleComponent, ButtonComponent],
})
export class LayoutHeaderComponent {
    private readonly loginService = inject(LoginService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // loginService
    public readonly isAuthenticated = this.loginService.isAuthenticated
    public readonly isCurrentUserAdmin = this.loginService.isCurrentUserAdmin
}
