import { Component, computed, inject, input } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { GroupWithMembersAndGames, InvitationWithAccountsData } from '../../api/api.types'
import { CountPipe } from '../../core/pipes/count.pipe'
import { DataService } from '../../core/services/data.service'
import { groupGameCount, groupPeopleCount } from '../../core/utils/groupCounts'
import { initialsAvatar } from '../../core/utils/initialsAvatar'
import { ImageProfileComponent } from '../image-profile/image-profile.component'
import { IconComponent } from '../ui/icon/icon.component'

/** Below this many people a group still feels empty, so its owner is nudged to invite more. */
export const INVITE_NUDGE_BELOW = 4
const AVATARS_SHOWN = 5

/** How a group's card on Home says where it stands. */
export type GroupActivity = { tone: 'live' | 'next' | 'past' | 'none'; label: string; time: number }

const ACTIVITY_CLASSES: Record<GroupActivity['tone'], string> = {
    live: 'bg-bv-success text-bv-on-success',
    next: 'bg-bv-primary-soft text-bv-on-primary-soft',
    past: 'bg-bv-surface-2 text-bv-text-muted',
    none: 'bg-bv-surface-2 text-bv-text-muted',
}

/**
 * A group on Home: who is in it, and one tap to what you open most. With several groups each gets
 * this card, stacked, and says where it stands (a night under way, the next one, or the last one);
 * with one, Home's next night above already says it.
 */
@Component({
    imports: [CountPipe, ImageProfileComponent, IconComponent, RouterLink],
    selector: 'app-card-group',
    templateUrl: 'card-group.component.html',
})
export class CardGroupComponent {
    private readonly dataService = inject(DataService)

    readonly group = input.required<GroupWithMembersAndGames>()
    readonly invitations = input.required<undefined | Array<InvitationWithAccountsData>>()
    /** Where the group stands, shown when Home has several groups; none hides it. */
    readonly activity = input<GroupActivity | null>(null)

    public readonly activityClass = computed(() => {
        const activity = this.activity()
        return activity ? ACTIVITY_CLASSES[activity.tone] : ''
    })

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
}
