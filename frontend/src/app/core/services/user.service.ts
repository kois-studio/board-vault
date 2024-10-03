import { Injectable, OnInit } from '@angular/core'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import { UserType } from '../../types/user.type'
import { LocalStorageService } from './local-storage.service'

@Injectable({ providedIn: 'root' })
export class UserService implements OnInit {
    public currentUser: UserType | null = null

    constructor(
        private readonly api: Api,
        private readonly toastServicee: ToastService,
        private readonly localStorageService: LocalStorageService,
    ) {}

    ngOnInit() {
        const token = this.localStorageService.getToken()
        const email = this.localStorageService.getItem('email')
        if (token && email) {
            // Fetch the user data
            this.api.getUserByEmail(email).subscribe({
                next: (userType) => {
                    this.setCurrentUser(userType)
                },
                error: (error) => {
                    this.toastServicee.error("Error retrieving user's data")
                },
            })
        }
    }

    public setCurrentUser(user: UserType) {
        this.currentUser = user
    }

    public clearCurrentUser() {
        this.currentUser = null
    }
}
