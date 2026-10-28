import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { LoginService } from '../../../core/services/login.service'

@Component({
    imports: [ButtonComponent, RouterLink],
    templateUrl: 'page-not-found.component.html',
})
export class PageNotFoundComponent {
    // Home is the dashboard once signed in, as the header logo has it.
    protected readonly isAuthenticated = inject(LoginService).isAuthenticated
}
