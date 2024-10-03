import { Component, effect } from '@angular/core'
import { UserService } from '../../core/services/user.service';
import { UserType } from '../../types/user.type';
import { Api } from '../../api/api';
import { GroupWithMembersType } from '../../types/group-with-members.type';

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
    standalone: true,
})
export class DashboardComponent {
    public userData: UserType | null = null
    public groupDetails: GroupWithMembersType[] = []
    
    constructor(
        private readonly userService: UserService,
        private readonly api: Api,
    ) {
        effect(() => {
            this.userData = this.userService.currentUser()
            if (!this.userData) {
                return
            }

            // STEP 1: Fetch the group details
            this.api.getDashboardGroupWithMembers(this.userData.id).subscribe({
                next: (data) => {
                    this.groupDetails = data.map((group) => ({
                        groupId: group.groupId,
                        groupName: group.groupName,
                        groupCreatedBy: group.groupCreatedBy,
                        groupCreatedAt: new Date(group.groupCreatedAt).toLocaleDateString(),
                        membershipJoinedAt: new Date(group.membershipJoinedAt).toLocaleDateString(),
                    }))

                    // STEP 2: Fetch the members data
                },
                error: (error) => {
                    console.error(error)
                },
            })
        })
    }
}
