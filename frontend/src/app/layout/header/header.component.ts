import { Component } from '@angular/core'
import { RouterLink } from '@angular/router'
import { LocalStorageService } from '../../core/services/local-storage.service'
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component'

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    imports: [RouterLink, ProfileMenuComponent],
})
export class LayoutHeaderComponent {
    public currentLocale = 'en'

    constructor(private readonly localStorageService: LocalStorageService) {}

    get getIsLogged(): boolean {
        return !!this.localStorageService.token
    }
}
