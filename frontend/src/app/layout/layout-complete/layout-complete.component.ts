import { Component, inject } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { LoginService } from '../../core/services/login.service'
import { LayoutFooterComponent } from '../footer/footer.component'
import { LayoutHeaderComponent } from '../header/header.component'
import { LayoutTopBarComponent } from '../top-bar/top-bar.component'

/**
 * General layout with header and footer
 */
@Component({
    imports: [RouterOutlet, LayoutHeaderComponent, LayoutFooterComponent, LayoutTopBarComponent],
    selector: 'app-layout-complete',
    templateUrl: 'layout-complete.component.html',
})
export class LayoutCompleteComponent {
    private readonly loginService = inject(LoginService)

    get isLogged(): boolean {
        return !!this.loginService.getToken()
    }
}
