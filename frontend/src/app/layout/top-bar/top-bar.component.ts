import { Component } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'

/**
 * Top bar - is like a second header under the main header
 * used to display user profile and other options
 */
@Component({
    imports: [RouterLink, RouterLinkActive],
    selector: 'app-layout-top-bar',
    templateUrl: 'top-bar.component.html',
})
export class LayoutTopBarComponent {}
