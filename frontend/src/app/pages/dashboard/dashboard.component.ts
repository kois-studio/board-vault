import { Component, effect } from '@angular/core'
import { Api } from '../../api/api'
import { UserService } from '../../core/services/user.service'
import { GroupWithMembersType } from '../../types/group-with-members.type'
import { GroupMemberType, UserType } from '../../types/user.type'
import { GroupCardComponent } from "../../components/group-card/group-card.component";

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
    standalone: true,
    imports: [GroupCardComponent],
})
export class DashboardComponent {
    public userData: UserType | null = null
    public groupDetails: Array<GroupWithMembersType> = []
    public membersIndex: Record<GroupWithMembersType['groupId'], Array<GroupMemberType>> = {}

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
            this.api.getUserGroups(this.userData.id).subscribe({
                next: (data) => {
                    this.groupDetails = data.map((group) => ({
                        groupId: group.groupId,
                        groupName: group.groupName,
                        groupCreatedBy: group.groupCreatedBy,
                        groupCreatedAt: new Date(group.groupCreatedAt).toLocaleDateString(),
                        membershipJoinedAt: new Date(group.membershipJoinedAt).toLocaleDateString(),
                    }))

                    // STEP 2: Fetch the members data for each group
                    for (const group of this.groupDetails) {
                        this.api.getGroupMembers(group.groupId).subscribe({
                            next: (data) => {
                                this.membersIndex[group.groupId] = data
                            },
                            error: (error) => {
                                console.error(error)
                            },
                        })
                    }
                },
                error: (error) => {
                    console.error(error)
                },
            })
        })
    }
}
