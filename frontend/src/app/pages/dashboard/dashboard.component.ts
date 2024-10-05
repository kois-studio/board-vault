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
    public userGroups: Array<GroupWithMembersType> = []

    // (this {groupId} which {accountId[]} are member)
    public groupMembersIndex: Record<GroupWithMembersType['groupId'], Array<GroupMemberType['accountId']>> = {}

    // (this {accountId} which {UserData} has)
    public membersIndex: Record<GroupMemberType['accountId'], GroupMemberType> = {}

    // (this {accountId} which {Game[]} has)
    public gamesIndex: Record<GroupMemberType['accountId'], Array<GameType>> = {}
    constructor(
        private readonly userService: UserService,
        private readonly api: Api,
    ) {
        effect(() => {
            this.userData = this.userService.currentUser()

            /**
             * There are 2 options of userData changing:
             *      1. User logs in: null -> userType
             *      2. User modifies profile: userType -> userType
             *
             * If 1: fetch all data
             * If 2: we refresh the logged user's data in the membersIndex
             */
            if (this.userGroups.length === 0) {
                this.getAllData()
            } else {
                this.refreshUserDataInMembersIndex()
            }
        })
    }

    private refreshUserDataInMembersIndex() {
        if (!this.userData) {
            return
        }

        this.membersIndex[this.userData.id] = {
            accountId: this.userData.id,
            username: this.userData.username,
            display_name: this.userData.display_name,
            email: this.userData.email,
            imageUrl: this.userData.imageUrl,
        }
    }

    private getAllData() {
        if (!this.userData) {
            return
        }

        // STEP 1: Fetch the group details
        this.api.getUserGroups(this.userData.id).subscribe({
            next: (groups) => {
                this.userGroups = groups.map((group) => ({
                    groupId: group.groupId,
                    groupName: group.groupName,
                    groupCreatedBy: group.groupCreatedBy,
                    groupCreatedAt: new Date(group.groupCreatedAt).toLocaleDateString(),
                    membershipJoinedAt: new Date(group.membershipJoinedAt).toLocaleDateString(),
                }))

                // STEP 2: Fetch the members data for each group
                // Use concatMap to ensure sequential fetching of group members and their games
                from(this.userGroups)
                    .pipe(
                        concatMap((group) =>
                            this.api.getGroupMembers(group.groupId).pipe(
                                tap((members) => {
                                    this.groupMembersIndex[group.groupId] = members.map((member) => member.accountId)

                                    for (const member of members) {
                                        if (this.membersIndex[member.accountId]) {
                                            continue
                                        }
                                        this.membersIndex[member.accountId] = member
                                    }
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
    }
}
