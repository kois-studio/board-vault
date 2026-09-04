import { Component, computed, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ClerkService } from '../../core/services/clerk.service'

@Component({
    imports: [RouterLink],
    templateUrl: 'landing.component.html',
})
export class LandingComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly selfRegistrationEnabled = this.clerkService.isSelfRegistrationEnabled
    public readonly registrationCta = computed(() => (this.selfRegistrationEnabled() ? 'Create an account' : 'Get invited'))
}
