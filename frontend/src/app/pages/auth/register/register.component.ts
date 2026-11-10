import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { ClerkService } from '../../../core/services/clerk.service'

@Component({
    templateUrl: 'register.component.html',
    imports: [ButtonComponent, RouterLink, IconComponent],
})
export class RegisterComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly clerkIsConfigured = this.clerkService.isConfigured
    public readonly clerkIsAvailable = this.clerkService.isAvailable
    public readonly selfRegistrationEnabled = this.clerkService.isSelfRegistrationEnabled

    public openClerkSignUp(): void {
        this.clerkService.openSignUp()
    }
}
