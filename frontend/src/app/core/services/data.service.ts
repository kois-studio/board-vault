import { Injectable, type WritableSignal, effect, signal } from '@angular/core'
import { concatMap, from, of, tap } from 'rxjs'
import { Api } from '../../api/api'
import { ToastService } from '../../components/toast/toast.service'
import type { GameType } from '../../types/game.type'
import type { GroupWithMembersType } from '../../types/group-with-members.type'
import type { InvitationType, InvitationWithAccountsData } from '../../types/invitation.type'
import type { GroupMemberType, UserType } from '../../types/user.type'
import { LocalStorageService } from './local-storage.service'

type GroupId = GroupWithMembersType['groupId']
type AccountId = GroupMemberType['accountId']

@Injectable({ providedIn: 'root' })
export class DataService {
    public currentUser: WritableSignal<null | UserType> = signal(null)
    // --------------------------------------------------------------------------
    //         ARRAYS OF DATA
    // --------------------------------------------------------------------------
    public userGroups: WritableSignal<Array<GroupWithMembersType>> = signal([])
    public gamesList: WritableSignal<Array<GameType>> = signal([])

    // --------------------------------------------------------------------------
    //         INDEXES (for fast access to data)
    // --------------------------------------------------------------------------
    // (this {groupId} which {accountId[]} are member)
    public groupMembersIndex: WritableSignal<Record<GroupId, Array<AccountId>>> = signal({})

    // (this {accountId} which {UserData} has)
    public membersIndex: WritableSignal<Record<AccountId, GroupMemberType>> = signal({})

    // (this {accountId} which {Game[]} has)
    public gamesIndex: WritableSignal<Record<AccountId, Array<GameType>>> = signal({})

    // (this {groupId} which {Invitation[]} has pending)
    public invitationsGroupIndex: WritableSignal<Record<GroupId, Array<InvitationWithAccountsData>>> = signal({})

    // (this {accountId} which {Invitation[]} has received)
    public invitationsUserReceivedIndex: WritableSignal<Record<AccountId, Array<InvitationType>>> = signal({}) // TODO: needed?

    // (this {accountId} which {Invitation[]} has sent)
    public invitationsUserSentIndex: WritableSignal<Record<AccountId, Array<InvitationType>>> = signal({}) // TODO: needed?

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
            next: (groups) => {
                const formattedGroups = groups.map((group) => ({
                    groupId: group.groupId,
                    groupName: group.groupName,
                    groupCreatedBy: group.groupCreatedBy,
                    groupCreatedAt: new Date(group.groupCreatedAt).toLocaleDateString(),
                    membershipJoinedAt: new Date(group.membershipJoinedAt).toLocaleDateString(),
                }))

                this.userGroups.set(formattedGroups)

                // Fetch the members data for each group
                this._getGroupMembers()
            },
            error: (error) => {
                this.toastService.error("Error retrieving user's groups")
            },
        })
    }

    private _getGroupMembers() {
        // Use concatMap to ensure sequential fetching of group members, their games, and group invitations
        from(this.userGroups())
            .pipe(
                concatMap((group) =>
                    this.api.getGroupMembers(group.groupId).pipe(
                        tap((members) => {
                            this.groupMembersIndex.update((index) => ({
                                ...index,
                                [group.groupId]: members.map((member) => member.accountId),
                            }))

                            for (const member of members) {
                                const currentMembersIndex = this.membersIndex()
                                if (currentMembersIndex[member.accountId]) {
                                    continue
                                }
                                currentMembersIndex[member.accountId] = member
                            }
                        }),
                        // Fetch group invitations for each group and log the result
                        concatMap((members) =>
                            this.api.getGroupInvitations(group.groupId).pipe(
                                tap((invitations) => {
                                    this.invitationsGroupIndex.update((index) => ({
                                        ...index,
                                        [group.groupId]: invitations,
                                    }))
                                }),
                                // Proceed with fetching user games after logging invitations
                                concatMap(() =>
                                    from(members).pipe(
                                        concatMap((member) => {
                                            const currentGamesIndex = this.gamesIndex()
                                            if (currentGamesIndex[member.accountId]) {
                                                return of(null) // Skip the request
                                            }

                                            return this.api.getUserGames(member.accountId).pipe(
                                                tap((games) => {
                                                    currentGamesIndex[member.accountId] = games
                                                }),
                                            )
                                        }),
                                    ),
                                ),
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
