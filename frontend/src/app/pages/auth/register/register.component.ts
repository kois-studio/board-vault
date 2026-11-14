import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { ClerkService } from '../../../core/services/clerk.service'
import { ClerkFormComponent } from '../clerk-form/clerk-form.component'

@Component({
    templateUrl: 'register.component.html',
    imports: [ButtonComponent, ClerkFormComponent, RouterLink, IconComponent],
})
export class RegisterComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly clerkIsConfigured = this.clerkService.isConfigured
    public readonly clerkIsAvailable = this.clerkService.isAvailable
    public readonly clerkIsLoaded = this.clerkService.isLoaded
    public readonly selfRegistrationEnabled = this.clerkService.isSelfRegistrationEnabled

    /** Clerk didn't load: loading the page again is the way to try again. */
    public retry(): void {
        location.reload()
    }
}
