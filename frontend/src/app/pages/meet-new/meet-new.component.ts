import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: 'meet-new.component.html',
})
export class MeetNewComponent {
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    public userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public invitationsGroupIndex: ReturnType<typeof this.dataService.invitationsGroupIndex> = {}

    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupData: null | (typeof this.userGroups)[number] = null
    public dateForm = new FormControl('', [Validators.required])
    public isLoading = false
    public today = new Date().toISOString().split('T')[0] // Format: YYYY-MM-DD

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()
            this.invitationsGroupIndex = this.dataService.invitationsGroupIndex()

            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
            const groupData = this.userGroups.find((group) => group.id === groupId)

            if (Number.isNaN(groupId) || !this.userData || !groupData) {
                return
            }

            this.groupData = groupData
        })
    }

    get dateClass() {
        if (!this.dateForm.dirty && !this.dateForm.touched) return ''
        return this.dateForm.valid ? 'border-green-500' : 'border-red-500'
    }

    get disableCreateButton() {
        if (!this.dateForm.value) {
            return true
        }

        return this.isLoading || this.dateForm.invalid
    }

    onGoBack() {
        this.router.navigate(['/group', this.groupData?.id])
    }

    onClickCreateMeeting() {
        const accountId = this.userData?.id
        const groupId = this.groupData?.id

        if (accountId && groupId) {
            this.dataService.createMeeting(accountId, groupId)
        }
        // DO NOTHING more, the dataService will redirect to the correct /meet/:id
    }
}
