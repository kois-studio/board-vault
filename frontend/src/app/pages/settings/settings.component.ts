import { Component, inject } from '@angular/core'
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [ContainerWrapperComponent, CardAccountComponent, RouterLink, RouterLinkActive, RouterOutlet],
    templateUrl: './settings.component.html',
})
export class SettingsPageComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
}
