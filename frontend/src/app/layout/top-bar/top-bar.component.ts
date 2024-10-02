import { Component } from '@angular/core'
import { ProfileComponent } from '../../pages/profile/profile.component'

/**
 * Top bar - is like a second header under the main header
 * used to display user profile and other options
 */
@Component({
    standalone: true,
    imports: [ProfileComponent],
    selector: 'app-layout-top-bar',
    templateUrl: 'top-bar.component.html',
})
export class LayoutTopBarComponent {}
