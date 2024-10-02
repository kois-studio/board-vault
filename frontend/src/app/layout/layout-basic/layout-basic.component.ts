import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'

/**
 * Basic layout with nothing apart from the content
 * Used for example in /login and /register
 * to display the forms alone
 */
@Component({
    standalone: true,
    imports: [RouterOutlet],
    selector: 'app-layout-basic',
    templateUrl: 'layout-basic.component.html',
})
export class LayoutBasicComponent {}
