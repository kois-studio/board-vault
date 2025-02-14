import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [],
    templateUrl: 'group-delete.component.html',
})
export class GroupDeleteComponent {
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

    onConfirmDeleteGroup() {
        if (!this.groupData) return
        this.dataService.deleteGroup(this.groupData.id)
        this.router.navigate(['/dashboard'])
    }
}
