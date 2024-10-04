import { Component, effect } from '@angular/core'
import { Api } from '../../api/api'
import { GroupCardComponent } from '../../components/group-card/group-card.component'
import { UserService } from '../../core/services/user.service'
import type { GameType } from '../../types/game.type'
import type { GroupWithMembersType } from '../../types/group-with-members.type'
import type { GroupMemberType, UserType } from '../../types/user.type'

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
    public gamesIndex: Record<GroupMemberType['accountId'], Array<GameType>> = {}
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
                    console.log(`STEP 1: fetched ${this.groupDetails.length} groups`)

                    // STEP 2: Fetch the members data for each group
                    for (const group of this.groupDetails) {
                        this.api.getGroupMembers(group.groupId).subscribe({
                            next: (data) => {
                                this.membersIndex[group.groupId] = data
                                console.log(`STEP 2: fetched ${data.length} members for group ${group.groupName}`)

                                // STEP 3: Fetch the games each member has
                                for (const member of data) {
                                    if (this.gamesIndex[member.accountId]) {
                                        // then we already fetched the games for this member
                                        console.log(`STEP 3❌: skipping ${member.username}`)
                                        continue
                                    }
                                    console.log(`STEP 3✅: fetching games for ${member.username}`)
                                    this.api.getUserGames(member.accountId).subscribe({
                                        next: (data) => {
                                            this.gamesIndex[member.accountId] = data
                                            console.log(this.gamesIndex)
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
                    }
                },
                error: (error) => {
                    console.error(error)
                },
            })
        })
    }
}
