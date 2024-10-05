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
        private readonly toastServicee: ToastService,
        private readonly localStorageService: LocalStorageService,
    ) {
        const token = this.localStorageService.getToken()
        const email = this.localStorageService.getItem('email')
        if (token && email) {
            // Fetch the user data
            this.api.getUserByEmail(email).subscribe({
                next: (userType) => {
                    this.currentUser.set(userType)
                },
                error: (error) => {
                    if (error.status === 401) {
                        this.toastServicee.error('Session expired, please log in again')
                        this.localStorageService.clear()
                        this.currentUser.set(null)
                        return
                    }

                    this.toastServicee.error("Error retrieving user's data")
                },
            })
        }
    }
}
