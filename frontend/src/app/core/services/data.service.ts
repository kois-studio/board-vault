import { Injectable, type WritableSignal, effect, signal } from '@angular/core'
import { concatMap, from, of, tap } from 'rxjs'
import { Api } from '../../api/api'
import type { GameType } from '../../types/game.type'
import type { GroupWithMembersType } from '../../types/group-with-members.type'
import type { InvitationType, InvitationWithAccountsData } from '../../types/invitation.type'
import type { GroupMemberType } from '../../types/user.type'
import { UserService } from './user.service'

type GroupId = GroupWithMembersType['groupId']
type AccountId = GroupMemberType['accountId']

@Injectable({ providedIn: 'root' })
export class DataService {
    // --------------------------------------------------------------------------
    //         ARRAYS OF DATA
    // --------------------------------------------------------------------------
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
    public userGroups: ReturnType<typeof this.userService.userGroups> = []

    constructor(
        private readonly api: Api,
        private readonly userService: UserService,
    ) {
        effect(() => {
            this.userGroups = this.userService.userGroups()

            // data may not be available yet
            if (!this.userGroups.length) {
                return
            }

            // STEP 1: Fetch the members data for each group
            this._getGroupMembers()
        })
    }

    private _getGroupMembers() {
        // Use concatMap to ensure sequential fetching of group members, their games, and group invitations
        from(this.userGroups)
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
