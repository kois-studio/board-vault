import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ClerkService } from '../../../core/services/clerk.service'
import { FormLoginComponent } from './form-login/form-login.component'

@Component({
    templateUrl: 'login.component.html',
    imports: [RouterLink, FormLoginComponent],
})
export class LoginComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly clerkIsAvailable = this.clerkService.isAvailable

    public openClerkSignIn(): void {
        this.clerkService.openSignIn()
    }
}
