import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component'
import { LoginService } from '../../core/services/login.service'

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    imports: [RouterLink, ProfileMenuComponent],
})
export class LayoutHeaderComponent {
    private readonly loginService = inject(LoginService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // loginService
    public readonly loginState$ = this.loginService.loginState

    get isLogged(): boolean {
        return !!this.loginState$().token
    }
}
