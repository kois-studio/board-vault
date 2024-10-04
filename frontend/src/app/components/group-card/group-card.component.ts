import { Component, Input } from '@angular/core'
import type { GameType } from '../../types/game.type'
import type { GroupWithMembersType } from '../../types/group-with-members.type'
import type { GroupMemberType } from '../../types/user.type'
import { ImageProfileComponent } from '../image-profile/image-profile.component'

@Component({
    standalone: true,
    imports: [ImageProfileComponent],
    selector: 'app-group-card',
    templateUrl: 'group-card.component.html',
})
export class GroupCardComponent {
    @Input({ required: true }) group!: GroupWithMembersType
    @Input({ required: true }) membersIndex: Record<GroupWithMembersType['groupId'], Array<GroupMemberType>> = {}
    @Input({ required: true }) gamesIndex: Record<GroupMemberType['accountId'], Array<GameType>> = {}
}
