import { Component, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { ClerkService } from '../../../core/services/clerk.service'
import { LandingComponent } from '../../landing/landing.component'
import { openClerkDialogWhenReady } from '../clerk-dialog/open-clerk-dialog'

/** `/register`: the landing page with Clerk's sign-up dialog over it (#343), or a notice while sign-up is paused. */
@Component({
    templateUrl: 'register.component.html',
    imports: [ButtonComponent, IconComponent, LandingComponent, RouterLink],
})
export class RegisterComponent {
    private readonly clerkService = inject(ClerkService)

    public readonly selfRegistrationEnabled = this.clerkService.isSelfRegistrationEnabled

    constructor() {
        if (this.selfRegistrationEnabled()) openClerkDialogWhenReady('sign-up')
    }
}
