import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { RouterLink } from '@angular/router'
import { CardGroupComponent } from '../../components/card-group/card-group.component'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CardGroupComponent, RouterLink, CommonModule],
    templateUrl: 'dashboard.component.html',
})
export class DashboardComponent {
    // DataService data (filled on init -> effect)
    public loadingStatesIndex: ReturnType<typeof this.dataService.loadingStatesIndex> = {}
    public userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public invitationsGroupIndex: ReturnType<typeof this.dataService.invitationsGroupIndex> = {}

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.loadingStatesIndex = this.dataService.loadingStatesIndex()
            this.userGroups = this.dataService.userGroups()
            this.invitationsGroupIndex = this.dataService.invitationsGroupIndex()
        })
    }
}
