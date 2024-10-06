import { Injectable, type WritableSignal, effect, signal } from '@angular/core'
import { concatMap, from, of, tap } from 'rxjs'
import { Api } from '../../api/api'
import type { GameType } from '../../types/game.type'
import type { GroupWithMembersType } from '../../types/group-with-members.type'
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
        // Use concatMap to ensure sequential fetching of group members and their games
        from(this.userGroups)
            .pipe(
                concatMap((group) =>
                    this.api.getGroupMembers(group.groupId).pipe(
                        tap((members) => {
                            const currentGroupMembersIndex = this.groupMembersIndex()
                            const updatedIndex = {
                                ...currentGroupMembersIndex,
                                [group.groupId]: members.map((member) => member.accountId),
                            }
                            this.groupMembersIndex.set(updatedIndex)

                            for (const member of members) {
                                const currentMembersIndex = this.membersIndex()
                                if (currentMembersIndex[member.accountId]) {
                                    continue
                                }
                                currentMembersIndex[member.accountId] = member
                            }
                        }),
                        concatMap((members) =>
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
            )
            .subscribe({
                error: (error) => {
                    console.error(error)
                },
            })
    }
}
