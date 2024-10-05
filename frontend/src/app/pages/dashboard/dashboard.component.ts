import { Component, effect } from '@angular/core'
import { concatMap, firstValueFrom, from, lastValueFrom, of, tap } from 'rxjs'
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
        effect(async () => {
            this.userData = this.userService.currentUser()
            this.userGroups = this.userService.userGroups()
            this.groupMembersIndex = this.dataService.groupMembersIndex()
            this.membersIndex = this.dataService.membersIndex()
            this.gamesIndex = this.dataService.gamesIndex()

            // data may not be available yet
            if (!this.userData) {
                return
            }

            /**
             * There are 2 options of userData changing:
             *      1. User logs in: null -> userType
             *      2. User modifies profile: userType -> userType
             *
             * If 1: fetch all data
             * If 2: we refresh the logged user's data in the membersIndex
             */
            if (this.userGroups.length > 0) {
                // case 2
                this._refreshUserDataInMembersIndex(this.userData)
            } else {
                // case 1
                await this._getUserGroups(this.userData)
                this._getGroupMembers()
            }
        })
    }

    private _refreshUserDataInMembersIndex(user: NonNullable<typeof this.userData>) {
        this.membersIndex[user.id] = {
            accountId: user.id,
            username: user.username,
            display_name: user.display_name,
            email: user.email,
            imageUrl: user.imageUrl,
        }
    }

    private async _getUserGroups(user: NonNullable<typeof this.userData>) {
        // STEP 1: Fetch the group details
        const groups = await firstValueFrom(this.api.getUserGroups(user.id))
        const formattedGroups = groups.map((group) => ({
            groupId: group.groupId,
            groupName: group.groupName,
            groupCreatedBy: group.groupCreatedBy,
            groupCreatedAt: new Date(group.groupCreatedAt).toLocaleDateString(),
            membershipJoinedAt: new Date(group.membershipJoinedAt).toLocaleDateString(),
        }))

        // assign both local variable and the service
        this.userGroups = formattedGroups
        this.userService.userGroups.set(formattedGroups)
    }

    private _getGroupMembers() {
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
    }
}
