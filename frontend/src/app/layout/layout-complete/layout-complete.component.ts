import { Component } from '@angular/core'
import { RouterOutlet } from '@angular/router'
import { LocalStorageService } from '../../core/services/local-storage.service'
import { LayoutFooterComponent } from '../footer/footer.component'
import { LayoutHeaderComponent } from '../header/header.component'
import { LayoutTopBarComponent } from '../top-bar/top-bar.component'

/**
 * General layout with header and footer
 */
@Component({
    imports: [RouterOutlet, LayoutHeaderComponent, LayoutFooterComponent, LayoutTopBarComponent],
    selector: 'app-layout-complete',
    templateUrl: 'layout-complete.component.html',
})
export class LayoutCompleteComponent {
    constructor(private readonly localStorageService: LocalStorageService) {}

    get getIsLogged(): boolean {
        return !!this.localStorageService.token
    }
}
