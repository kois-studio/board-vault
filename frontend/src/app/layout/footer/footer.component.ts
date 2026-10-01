import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LoginService } from '../../core/services/login.service'

@Component({
    selector: 'app-layout-footer',
    imports: [RouterLink],
    templateUrl: './footer.component.html',
})
export class LayoutFooterComponent {
    public readonly isAuthenticated = inject(LoginService).isAuthenticated
    public currentLocale = 'en'
    public date = new Date().getFullYear().toString()
}
