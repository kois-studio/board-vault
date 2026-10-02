import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { ButtonComponent } from '../../../components/ui/button/button.component'

@Component({
    imports: [ButtonComponent, RouterLink],
    templateUrl: 'page-not-found.component.html',
})
export class PageNotFoundComponent {}
