import { Component, effect } from '@angular/core'
import { concatMap, from, of, tap } from 'rxjs'
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
                next: (groups) => {
                    this.groupDetails = groups.map((group) => ({
                        groupId: group.groupId,
                        groupName: group.groupName,
                        groupCreatedBy: group.groupCreatedBy,
                        groupCreatedAt: new Date(group.groupCreatedAt).toLocaleDateString(),
                        membershipJoinedAt: new Date(group.membershipJoinedAt).toLocaleDateString(),
                    }))

                    // STEP 2: Fetch the members data for each group
                    // Use concatMap to ensure sequential fetching of group members and their games
                    from(this.groupDetails)
                        .pipe(
                            concatMap((group) =>
                                this.api.getGroupMembers(group.groupId).pipe(
                                    tap((members) => {
                                        this.membersIndex[group.groupId] = members
                                    }),
                                    concatMap((members) =>
                                        from(members).pipe(
                                            concatMap((member) => {
                                                if (this.gamesIndex[member.accountId]) {
                                                    return of(null) // Skip the request
                                                }

                                                return this.api.getUserGames(member.accountId).pipe(
                                                    tap((games) => {
                                                        this.gamesIndex[member.accountId] = games
                                                    }),
                                                )
                                            }),
                                        ),
                                    ),
                                ),
                            ),
                        )
                        .subscribe({
                            error: (error) => {
                                console.error(error)
                            },
                        })
                },
                error: (error) => {
                    console.error(error)
                },
            })
        })
    }
}
