import { CommonModule } from '@angular/common';
import { Component, effect } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { DataService } from '../../core/services/data.service';

@Component({
    standalone: true,
    imports: [CommonModule, ReactiveFormsModule],
    templateUrl: 'meet-new.component.html'
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
    public groupNameForm = new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(20)])
    public isLoading = false

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

    get groupName() {
        return this.groupNameForm.get('groupName')
    }

    get groupNameClass() {
        if (!this.groupNameForm.dirty && !this.groupNameForm.touched) return ''
        return this.groupNameForm.valid ? 'border-green-500' : 'border-red-500'
    }

    get disableCreateButton() {
        if (!this.groupNameForm.value) {
            return true
        }
        return this.isLoading || this.groupNameForm.invalid
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
