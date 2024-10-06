import { Injectable, type WritableSignal, signal } from '@angular/core'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import type { GroupWithMembersType } from '../../types/group-with-members.type'
import type { UserType } from '../../types/user.type'
import { LocalStorageService } from './local-storage.service'

@Injectable({ providedIn: 'root' })
export class UserService {
    public currentUser: WritableSignal<null | UserType> = signal(null)
    public userGroups: WritableSignal<Array<GroupWithMembersType>> = signal([])

    constructor(
        private readonly api: Api,
        private readonly toastService: ToastService,
        private readonly localStorageService: LocalStorageService,
    ) {
        const token = this.localStorageService.getToken()
        const email = this.localStorageService.getItem('email')
        if (token && email) {
            // 1. Get the user data
            this._getUserData(email)
        }
    }

    private _getUserData(email: string) {
        this.api.getUserByEmail(email).subscribe({
            next: (userType) => {
                this.currentUser.set(userType)

                // 2. Get the user's groups
                this._getUserGroups(userType)
            },
            error: (error) => {
                if (error.status === 401) {
                    this.toastService.error('Session expired, please log in again')
                    this.localStorageService.clear()
                    this.currentUser.set(null)
                    // TODO: when token expired, the user experience is not good
                    return
                }

                this.toastService.error("Error retrieving user's data")
            },
        })
    }

    private async _getUserGroups(user: UserType) {
        this.api.getUserGroups(user.id).subscribe({
            next: (groups) => {
                const formattedGroups = groups.map((group) => ({
                    groupId: group.groupId,
                    groupName: group.groupName,
                    groupCreatedBy: group.groupCreatedBy,
                    groupCreatedAt: new Date(group.groupCreatedAt).toLocaleDateString(),
                    membershipJoinedAt: new Date(group.membershipJoinedAt).toLocaleDateString(),
                }))

                this.userGroups.set(formattedGroups)
            },
            error: (error) => {
                this.toastService.error("Error retrieving user's groups")
            },
        })
    }
}
