import { Component } from '@angular/core'
import { Router, RouterLink, RouterLinkActive } from '@angular/router'
import { LanguageSelectorComponent } from '../../components/language-selector/language-selector.component'
import { LocalStorageService } from '../../core/services/local-storage.service'

@Component({
    selector: 'app-layout-header',
    templateUrl: './header.component.html',
    standalone: true,
    imports: [RouterLink, RouterLinkActive, LanguageSelectorComponent],
})
export class LayoutHeaderComponent {
    public currentLocale = 'en'
    public styles = {
        link: 'b-0 cursor-pointer p-2 text-xl font-bold tracking-wider hover:text-green-600',
    }

    constructor(
        private readonly localStorageService: LocalStorageService,
        private readonly router: Router,
    ) {}

    get getIsLogged(): boolean {
        return !!this.localStorageService.token
    }

    public logout() {
        this.localStorageService.deleteToken()
        this.router.navigate(['/login'])
    }
}
