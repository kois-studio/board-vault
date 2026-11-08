import { Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { LoginService } from '../../core/services/login.service'
import { AuthHandoffComponent } from '../auth-handoff/auth-handoff.component'
import { ConnectivityBannerComponent } from '../connectivity-banner/connectivity-banner.component'

/**
 * Basic layout with nothing apart from the content, for focused pages such as
 * creating a group or logging a game night.
 *
 * Like the complete layout, it shows the auth handoff screen instead of the
 * page while a signed-in account is still being resolved (#239), and the
 * "can't reach Board Vault" notice above the page (#241).
 */
@Component({
    imports: [RouterOutlet, AuthHandoffComponent, ConnectivityBannerComponent],
    selector: 'app-layout-basic',
    templateUrl: 'layout-basic.component.html',
})
export class LayoutBasicComponent {
    private readonly loginService = inject(LoginService)

    public readonly isClerkAuthHandoffActive = this.loginService.isClerkAuthHandoffActive
}
