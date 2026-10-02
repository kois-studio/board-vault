import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ClerkService } from '../../../core/services/clerk.service'

@Component({
    templateUrl: 'login.component.html',
    imports: [ButtonComponent, RouterLink],
})
export class LoginComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly clerkIsConfigured = this.clerkService.isConfigured
    public readonly clerkIsLoaded = this.clerkService.isLoaded
    public readonly clerkIsAvailable = this.clerkService.isAvailable

    public openClerkSignIn(): void {
        this.clerkService.openSignIn()
    }
}
