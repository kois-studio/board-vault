import { Component } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { LanguageSelectorComponent } from '../../components/language-selector/language-selector.component'
import { LocalStorageService } from '../../core/services/local-storage.service'
import { ProfileMenuComponent } from '../profile-menu/profile-menu.component'

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, LanguageSelectorComponent, ProfileMenuComponent],
})
export class LayoutHeaderComponent {
    public currentLocale = 'en'

    constructor(private readonly localStorageService: LocalStorageService) {}

    get getIsLogged(): boolean {
        return !!this.localStorageService.token
    }
}
