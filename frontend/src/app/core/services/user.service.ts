import { Injectable } from '@angular/core'
import { UserType } from '../../types/user.type'

@Injectable({ providedIn: 'root' })
export class UserService {
    public currentUser: UserType | null = null

    public setCurrentUser(user: UserType) {
        this.currentUser = user
    }

    public clearCurrentUser() {
        this.currentUser = null
    }
}
