import { Component } from '@angular/core'
import { RouterLink, RouterLinkActive } from '@angular/router'
import { LanguageSelectorComponent } from '../../components/language-selector/language-selector.component'
import { ProfileMenuComponent } from '../../components/profile-menu/profile-menu.component'
import { ProfileSettingsComponent } from '../../components/profile-settings/profile-settings.component'
import { LocalStorageService } from '../../core/services/local-storage.service'

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, LanguageSelectorComponent, ProfileMenuComponent, ProfileSettingsComponent],
})
export class LayoutHeaderComponent {
    public currentLocale = 'en'

    constructor(private readonly localStorageService: LocalStorageService) {}

    get getIsLogged(): boolean {
        return !!this.localStorageService.token
    }
}
