import { Component, computed, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { GroupWithMembersAndGames, InvitationWithAccountsData } from '../../api/api.types'
import { DataService } from '../../core/services/data.service'
import { groupGameCount, groupPeopleCount } from '../../core/utils/groupCounts'
import { initialsAvatar } from '../../core/utils/initialsAvatar'
import { ImageProfileComponent } from '../image-profile/image-profile.component'
import { IconComponent } from '../ui/icon/icon.component'

/** Below this many people a group still feels empty, so its owner is nudged to invite more. */
export const INVITE_NUDGE_BELOW = 4
const AVATARS_SHOWN = 5

/**
 * A group on Home when it is your only one: who is in it, and one tap to what you open most.
 * Its next night is not repeated here; Home shows it above.
 */
@Component({
    imports: [ImageProfileComponent, IconComponent, RouterLink],
    selector: 'app-card-group',
    templateUrl: 'card-group.component.html',
})
export class CardGroupComponent {
    private readonly dataService = inject(DataService)

    readonly group = input.required<GroupWithMembersAndGames>()
    readonly invitations = input.required<undefined | Array<InvitationWithAccountsData>>()

    /** Members plus people without an account. */
    public readonly peopleCount = computed(() => groupPeopleCount(this.group()))

    /** Distinct games owned by anyone in the group, members or people without an account. */
    public readonly sharedGameCount = computed(() => groupGameCount(this.group()))

    /** The first few faces, members before people without an account. */
    public readonly avatars = computed(() =>
        [
            ...this.group().members.map((member) => ({ key: `a${member.id}`, name: member.displayName, avatar: member.avatar })),
            ...(this.group().placeholders ?? []).map((person) => ({
                key: `p${person.id}`,
                name: person.displayName,
                avatar: person.avatar ?? initialsAvatar(person.displayName),
            })),
        ].slice(0, AVATARS_SHOWN),
    )
    public readonly hiddenPeople = computed(() => Math.max(0, this.peopleCount() - AVATARS_SHOWN))

    /** Only the owner invites (ADR-0007), and only while the group is still small. */
    public readonly showInviteNudge = computed(
        () => this.group().createdBy === this.dataService.currentUser()?.id && this.peopleCount() < INVITE_NUDGE_BELOW,
    )
    public readonly pendingInvitations = computed(() => this.invitations()?.length ?? 0)

    public readonly shortcutsLabel = computed(
        () =>
            $localize`:Name of the shortcuts on a group card on Home; the placeholder is the group name:${this.group().name}:group: shortcuts`,
    )
}
