import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LoginService } from '../../core/services/login.service'
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component'
import { DarkModeToggleComponent } from "../../components/ui/dark-mode-toggle/dark-mode-toggle.component";

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    imports: [RouterLink, ProfileMenuComponent, DarkModeToggleComponent],
})
export class LayoutHeaderComponent {
    private readonly loginService = inject(LoginService)

    get isLogged(): boolean {
        return !!this.loginService.token
    }
}
