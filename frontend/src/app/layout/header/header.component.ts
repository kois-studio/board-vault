import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LoginService } from '../../core/services/login.service'
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component'

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    imports: [RouterLink, ProfileMenuComponent],
})
export class LayoutHeaderComponent {
    private readonly loginService = inject(LoginService)

    get isLogged(): boolean {
        return !!this.loginService.getToken()
    }
}
