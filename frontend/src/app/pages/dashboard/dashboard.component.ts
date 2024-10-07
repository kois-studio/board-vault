import { Component, effect } from '@angular/core'
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
    public invitationsGroupIndex: ReturnType<typeof this.dataService.invitationsGroupIndex> = {}

    constructor(
        private readonly userService: UserService,
        private readonly dataService: DataService,
    ) {
        effect(async () => {
            this.userData = this.userService.currentUser()
            this.userGroups = this.userService.userGroups()
            this.groupMembersIndex = this.dataService.groupMembersIndex()
            this.membersIndex = this.dataService.membersIndex()
            this.gamesIndex = this.dataService.gamesIndex()
            this.invitationsGroupIndex = this.dataService.invitationsGroupIndex()

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
                // this._getGroupMembers()
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

    public membersInGroup(groupId: number) {
        const members = this.groupMembersIndex[groupId]
        if (!members) {
            return []
        }
        return members.map((memberId) => this.membersIndex[memberId])
    }
}
