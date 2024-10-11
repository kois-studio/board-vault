import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [],
    templateUrl: 'group-leave.component.html',
})
export class GroupLeaveComponent {
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    public userGroups: ReturnType<typeof this.dataService.userGroups> = []

    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupData: null | (typeof this.userGroups)[number] = null

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userGroups = this.dataService.userGroups()

            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
            const groupData = this.userGroups.find((group) => group.id === groupId)

            if (Number.isNaN(groupId) || !groupData) {
                return
            }

            this.groupData = groupData
        })
    }
    onGoBack() {
        this.router.navigate(['/dashboard'])
    }

    onConfirmLeaveGroup() {
        if (!this.groupData) return
        this.dataService.leaveGroup(this.groupData.id)
    }
}
