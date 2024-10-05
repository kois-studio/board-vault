import { Component, effect } from '@angular/core'
import { concatMap, from, of, tap } from 'rxjs'
import { Api } from '../../api/api'
import { GroupCardComponent } from '../../components/group-card/group-card.component'
import { DataService } from '../../core/services/data.service'
import { UserService } from '../../core/services/user.service'

@Component({
    selector: 'app-dashboard',
    templateUrl: 'dashboard.component.html',
    standalone: true,
    imports: [GroupCardComponent],
})
export class DashboardComponent {
    public userData: ReturnType<typeof this.userService.currentUser> = null
    public userGroups: ReturnType<typeof this.userService.userGroups> = []
    public groupMembersIndex: ReturnType<typeof this.dataService.groupMembersIndex> = {}
    public membersIndex: ReturnType<typeof this.dataService.membersIndex> = {}
    public gamesIndex: ReturnType<typeof this.dataService.gamesIndex> = {}

    constructor(
        private readonly userService: UserService,
        private readonly dataService: DataService,
        private readonly api: Api,
    ) {
        effect(() => {
            this.userData = this.userService.currentUser()
            this.userGroups = this.userService.userGroups()

            this.groupMembersIndex = this.dataService.groupMembersIndex()
            this.membersIndex = this.dataService.membersIndex()
            this.gamesIndex = this.dataService.gamesIndex()

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
