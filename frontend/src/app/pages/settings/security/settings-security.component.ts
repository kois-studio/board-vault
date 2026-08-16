import { Component, inject } from '@angular/core'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ClerkService } from '../../../core/services/clerk.service'

@Component({
    imports: [ButtonComponent],
    templateUrl: './settings-security.component.html',
})
export class SettingsSecurityComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly clerkIsAvailable = this.clerkService.isAvailable

    public openClerkProfile(): void {
        this.clerkService.openUserProfile()
    }
}
