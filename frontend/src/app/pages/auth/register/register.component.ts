import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ClerkService } from '../../../core/services/clerk.service'
import { FormRegisterComponent } from './form-register/form-register.component'

@Component({
    templateUrl: 'register.component.html',
    imports: [RouterLink, FormRegisterComponent],
})
export class RegisterComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly clerkIsAvailable = this.clerkService.isAvailable

    public openClerkSignUp(): void {
        this.clerkService.openSignUp()
    }
}
