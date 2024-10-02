import { Component } from '@angular/core'

@Component({
    selector: 'app-layout-footer',
    templateUrl: './footer.component.html',
    standalone: true,
})
export class LayoutFooterComponent {
    public currentLocale = 'en'
    public date = new Date().getFullYear().toString()
}
