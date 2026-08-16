import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [],
    templateUrl: 'group-leave.component.html',
})
export class GroupLeaveComponent {
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    public userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public userData: ReturnType<typeof this.dataService.currentUser> = null

    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupData: null | (typeof this.userGroups)[number] = null
    public isLoading = false

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()

            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
            const groupData = this.userGroups.find((group) => group.id === groupId)

            if (Number.isNaN(groupId) || !groupData) {
                return
            }

            this.groupData = groupData
        })
    }

    get isGroupOwner() {
        return !!this.groupData && !!this.userData && this.groupData.createdBy === this.userData.id
    }

    onGoBack() {
        this.router.navigate(['/groups', this.groupData?.id])
    }

    async onConfirmLeaveGroup() {
        if (!this.groupData || this.isGroupOwner || this.isLoading) return
        this.isLoading = true

        try {
            await firstValueFrom(this.dataService.leaveGroup(this.groupData.id))
            this.router.navigate(['/dashboard'])
        } finally {
            this.isLoading = false
        }
    }
}
