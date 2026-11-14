import { Component, inject } from '@angular/core'
import { ClerkService } from '../../../core/services/clerk.service'
import { ClerkFormComponent } from '../clerk-form/clerk-form.component'

/** The sign-in page: a heading and Clerk's form on the page itself (#324). */
@Component({
    templateUrl: 'login.component.html',
    imports: [ClerkFormComponent],
})
export class LoginComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly clerkIsConfigured = this.clerkService.isConfigured
    public readonly clerkIsLoaded = this.clerkService.isLoaded
    public readonly clerkIsAvailable = this.clerkService.isAvailable
}
