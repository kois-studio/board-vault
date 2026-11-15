import { Component } from '@angular/core'
import { LandingComponent } from '../../landing/landing.component'
import { openClerkDialogWhenReady } from '../clerk-dialog/open-clerk-dialog'

/** `/login`: the landing page with Clerk's sign-in dialog open over it (#343). */
@Component({
    imports: [LandingComponent],
    template: '<app-landing />',
})
export class LoginComponent {
    constructor() {
        openClerkDialogWhenReady('sign-in')
    }
}
