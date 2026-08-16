import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'

@Component({
    selector: 'app-layout-footer',
    imports: [RouterLink],
    templateUrl: './footer.component.html',
})
export class LayoutFooterComponent {
    public currentLocale = 'en'
    public date = new Date().getFullYear().toString()
}
