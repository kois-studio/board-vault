import { Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { LoginService } from '../../core/services/login.service'
import { AuthHandoffComponent } from '../auth-handoff/auth-handoff.component'
import { LayoutFooterComponent } from '../footer/footer.component'
import { LayoutHeaderComponent } from '../header/header.component'
import { LayoutTopBarComponent } from '../top-bar/top-bar.component'

/**
 * General layout with header and footer
 */
@Component({
    imports: [RouterOutlet, LayoutHeaderComponent, LayoutFooterComponent, LayoutTopBarComponent, AuthHandoffComponent],
    selector: 'app-layout-complete',
    templateUrl: 'layout-complete.component.html',
})
export class LayoutCompleteComponent {
    private readonly loginService = inject(LoginService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // loginService
    public readonly isAuthenticated = this.loginService.isAuthenticated
    public readonly isClerkAuthHandoffActive = this.loginService.isClerkAuthHandoffActive
}
