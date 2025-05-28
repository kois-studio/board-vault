import { Component, inject } from '@angular/core'
import { DataService } from '../../../../core/services/data.service'

@Component({
    imports: [],
    templateUrl: 'admin.component.html',
})
export class AdminPageComponent {
    private readonly dataService = inject(DataService)

    // --------------------------------------------------------------------------
    //        signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
}
