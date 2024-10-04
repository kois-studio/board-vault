import { Component, Input } from '@angular/core'
import { GroupWithMembersType } from '../../types/group-with-members.type'
import { GroupMemberType } from '../../types/user.type'
import { ImageProfileComponent } from "../image-profile/image-profile.component";

@Component({
    standalone: true,
    imports: [ImageProfileComponent],
    selector: 'app-group-card',
    templateUrl: 'group-card.component.html',
})
export class GroupCardComponent {
    @Input({ required: true }) group!: GroupWithMembersType
    @Input({ required: true }) membersIndex: Record<GroupWithMembersType['groupId'], Array<GroupMemberType>> = {}
}
