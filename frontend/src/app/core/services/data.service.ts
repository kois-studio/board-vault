import { Injectable, type WritableSignal, effect, signal } from '@angular/core'
import { concatMap, from, of, tap } from 'rxjs'
import { Api } from '../../api/api'
import type { GameType, GroupWithMembersAndGames, InvitationWithAccountsData, UserType } from '../../api/api.types'
import { ToastService } from '../../components/toast/toast.service'
import { LocalStorageService } from './local-storage.service'

@Injectable({ providedIn: 'root' })
export class DataService {
    public currentUser: WritableSignal<null | UserType> = signal(null)
    // --------------------------------------------------------------------------
    //         ARRAYS OF DATA
    // --------------------------------------------------------------------------
    public userGroups: WritableSignal<Array<GroupWithMembersAndGames>> = signal([])
    public gamesList: WritableSignal<Array<GameType>> = signal([])

    // --------------------------------------------------------------------------
    //         INDEXES (for fast access to data)
    // --------------------------------------------------------------------------
    // (this {groupId} which {Invitation[]} has pending)
    public invitationsGroupIndex: WritableSignal<Record<number, Array<InvitationWithAccountsData>>> = signal({})

    // --------------------------------------------------------------------------
    // --------------------------------------------------------------------------
    constructor(
        private readonly api: Api,
        private readonly toastService: ToastService,
        private readonly localStorageService: LocalStorageService,
    ) {
        effect(() => {
            const token = this.localStorageService.getToken()
            const email = this.localStorageService.getItem('email')
            if (token && email) {
                // 1. Get the user data
                this._getUserData(email)
            }
        })
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
            next: (groupIds) => {
                from(groupIds)
                    .pipe(
                        concatMap((groupId) =>
                            this.api.getGroupWithMembersAndGames(groupId).pipe(
                                tap((group) => this.userGroups.update((groups) => [...groups, group])),
                                // Fetch group invitations for each group and log the result
                                concatMap((group) =>
                                    this.api.getGroupInvitations(groupId).pipe(
                                        tap((invitations) => {
                                            this.invitationsGroupIndex.update((index) => ({
                                                ...index,
                                                [groupId]: invitations,
                                            }))
                                        }),
                                    ),
                                ),
                            ),
                        ),
                    )
                    .subscribe()
            },
        })
    }
}
