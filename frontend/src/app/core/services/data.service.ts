import { Injectable, type WritableSignal, signal } from '@angular/core'
import type { GameType } from '../../types/game.type'
import type { GroupWithMembersType } from '../../types/group-with-members.type'
import type { GroupMemberType } from '../../types/user.type'

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
}
