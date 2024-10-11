import { Component, effect } from '@angular/core'
import { CardGroupComponent } from '../../components/card-group/card-group.component'
import { DataService } from '../../core/services/data.service'
import { RouterLink } from '@angular/router'

@Component({
    templateUrl: 'dashboard.component.html',
    standalone: true,
    imports: [CardGroupComponent, RouterLink],
})
export class DashboardComponent {
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    public userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public invitationsGroupIndex: ReturnType<typeof this.dataService.invitationsGroupIndex> = {}

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()
            this.invitationsGroupIndex = this.dataService.invitationsGroupIndex()
        })
    }
}
