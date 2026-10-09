import { HttpErrorResponse } from '@angular/common/http'
import { Component, computed, effect, inject, signal } from '@angular/core'
import { toSignal } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import { ClerkGroupInvitationSummaryType, ClerkGroupInvitationType, GroupPersonWorkspaceType } from '../../../api/api.types'
import { CardAccountComponent } from '../../../components/card-account/card-account.component'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { ToastService } from '../../../components/toast/toast.service'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { DialogDirective } from '../../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'
import { groupGameCount, groupPeopleCount } from '../../../core/utils/groupCounts'

@Component({
    imports: [
        ButtonComponent,
        RouterLink,
        ImageProfileComponent,
        ReactiveFormsModule,
        CardAccountComponent,
        CustomDatePipe,
        DialogDirective,
        IconComponent,
    ],
    templateUrl: 'group-edit.component.html',
})
export class GroupEditComponent {
    private readonly api = inject(Api)
    private readonly toastService = inject(ToastService)
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    public userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public invitationsGroupIndex: ReturnType<typeof this.dataService.invitationsGroupIndex> = {}

    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupData: null | (typeof this.userGroups)[number] = null
    /** `m<accountId>` or `i<invitationId>` while its inline confirmation is open. */
    public readonly pendingRemoval = signal<string | null>(null)
    /** A username or an email: an email gets a Clerk invitation, a username an in-app one. */
    public readonly inviteTarget = new FormControl('', { nonNullable: true })
    private readonly inviteValue = toSignal(this.inviteTarget.valueChanges, { initialValue: '' })
    public readonly inviteKind = computed(() => (this.inviteValue().includes('@') ? 'email' : 'username'))
    public readonly inviteError = signal<string | null>(null)
    public readonly clerkInvitation = signal<ClerkGroupInvitationType | null>(null)
    public readonly clerkPendingInvitations = signal<Array<ClerkGroupInvitationSummaryType>>([])
    public readonly clerkInvitationsLoading = signal(false)
    public readonly clerkInvitationsError = signal(false)
    public readonly pendingClerkRevokeId = signal<string | null>(null)
    public readonly groupPeople = signal<Array<GroupPersonWorkspaceType>>([])
    public readonly selectedClaimPersonId = signal<number | null>(null)
    /** People without an account an invitation can hand over (ADR-0010: the invitee reviews and claims). */
    public readonly claimablePeople = computed(() =>
        this.groupPeople().filter(({ person }) => person.kind === 'placeholder' && person.status === 'active'),
    )
    public readonly isDeleteDialogOpen = signal(false)
    public readonly isDeletingGroup = signal(false)
    public readonly isResolvingGroup = signal(true)
    public readonly groupResolutionError = signal(false)
    public readonly copyLinkStatus = signal<'idle' | 'copied' | 'unavailable' | 'failed'>('idle')
    public readonly isLoading = signal(false)
    private loadedClerkInvitationsGroupId: number | null = null

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
        private readonly loadingService: LoadingService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()
            this.invitationsGroupIndex = this.dataService.invitationsGroupIndex()

            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '', 10)
            const groupData = this.userGroups.find((group) => group.id === groupId)

            if (Number.isNaN(groupId) || !this.userData) {
                return
            }

            const isLoadingGroups = this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_GROUPS]
            if (isLoadingGroups) return

            if (this.dataService.userGroupsError() || !groupData) {
                this.isResolvingGroup.set(false)
                this.groupResolutionError.set(true)
                return
            }

            this.groupData = groupData
            this.isResolvingGroup.set(false)
            this.groupResolutionError.set(false)

            if (this.isGroupOwner) {
                this.loadClerkInvitations(groupData.id)
                this.loadGroupPeople(groupData.id)
            }
        })
    }

    get isGroupOwner() {
        return !!this.groupData && !!this.userData && this.groupData.createdBy === this.userData.id
    }

    public getPendingAccountInvitations(groupId: number) {
        return this.invitationsGroupIndex[groupId] ?? []
    }

    /** What is wrong with the entry, in words; null when it can be sent. */
    public inviteProblem(): string | null {
        const value = this.inviteTarget.value.trim()
        if (!value) return 'Enter their username or email.'
        if (this.inviteKind() === 'email') {
            return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && value.length <= 320 ? null : 'Enter a valid email address.'
        }
        if (value.length < 4 || value.length > 20) return 'Usernames have 4 to 20 characters.'
        const group = this.groupData
        if (group?.members.some((member) => member.username.toLowerCase() === value.toLowerCase())) return 'They are already in this group.'
        if (
            (this.invitationsGroupIndex[group?.id ?? -1] ?? []).some(
                (invitation) => invitation.toAccount.username.toLowerCase() === value.toLowerCase(),
            )
        ) {
            return 'They already have an invitation waiting.'
        }
        return null
    }

    public onInviteSubmit(event: SubmitEvent): void {
        event.preventDefault()
        this.inviteTarget.markAsTouched()
        if (this.inviteProblem() !== null) return
        void (this.inviteKind() === 'email' ? this.onInviteNewPerson() : this.onInviteUser())
    }

    get peopleCount(): number {
        return this.groupData ? groupPeopleCount(this.groupData) : 0
    }

    /** Distinct games anyone in the group owns, members or people without an account. */
    get gameCount(): number {
        return this.groupData ? groupGameCount(this.groupData) : 0
    }

    async onInviteUser() {
        const username = this.inviteTarget.value.trim()
        if (!this.isGroupOwner || !this.groupData || !username || this.isLoading()) return
        this.isLoading.set(true)
        this.inviteError.set(null)
        this.clerkInvitation.set(null)

        try {
            await firstValueFrom(this.dataService.addInvitedToGroup(this.groupData.id, username, this.selectedClaimPersonId()))
            this.inviteTarget.reset()
            this.selectedClaimPersonId.set(null)
        } catch (error) {
            this.inviteError.set(
                httpStatus(error) === 404
                    ? 'No Board Vault account has this username. Check it and try again; your entry is still here.'
                    : 'We could not send this invite. Check the username and try again; your entry is still here.',
            )
        } finally {
            this.isLoading.set(false)
        }
    }

    async onInviteNewPerson() {
        const email = this.inviteTarget.value.trim()
        if (!this.isGroupOwner || !this.groupData || !email || this.isLoading()) return
        this.isLoading.set(true)
        this.clerkInvitation.set(null)
        this.copyLinkStatus.set('idle')
        this.inviteError.set(null)

        try {
            const invitation = await firstValueFrom(
                this.dataService.inviteNewPersonToGroup(this.groupData.id, email, this.selectedClaimPersonId()),
            )
            this.clerkInvitation.set(invitation)
            this.inviteTarget.reset()
            this.selectedClaimPersonId.set(null)
            await this.refreshClerkInvitations(this.groupData.id)
        } catch (error) {
            this.inviteError.set(
                httpStatus(error) === 409
                    ? 'This email already has a pending invitation. Find it under Pending invitations, where you can revoke it and send a new one.'
                    : 'We could not send the email invitation. Check the address and try again; your entry is still here.',
            )
        } finally {
            this.isLoading.set(false)
        }
    }

    private loadGroupPeople(groupId: number): void {
        const loader = this.api.getGroupPeople
        if (typeof loader !== 'function') return
        loader.call(this.api, groupId).subscribe({
            next: (response) => {
                this.groupPeople.set(response.people)
                // "Invite" on a person without an account opens this page for them (?person=<id>).
                const requested = Number(this.route.snapshot.queryParamMap.get('person'))
                if (this.claimablePeople().some(({ person }) => person.id === requested)) this.selectedClaimPersonId.set(requested)
            },
            error: () => this.groupPeople.set([]),
        })
    }

    private async loadClerkInvitations(groupId: number): Promise<void> {
        if (this.loadedClerkInvitationsGroupId === groupId) return
        this.loadedClerkInvitationsGroupId = groupId
        this.clerkInvitationsLoading.set(true)
        this.clerkInvitationsError.set(false)
        try {
            const invitations = await firstValueFrom(this.api.getClerkGroupInvitations(groupId))
            this.clerkPendingInvitations.set(invitations)
        } catch {
            this.clerkInvitationsError.set(true)
        } finally {
            this.clerkInvitationsLoading.set(false)
        }
    }

    public async refreshClerkInvitations(groupId: number): Promise<void> {
        this.loadedClerkInvitationsGroupId = null
        await this.loadClerkInvitations(groupId)
    }

    public requestClerkRevoke(invitationId: string): void {
        this.pendingClerkRevokeId.set(this.pendingClerkRevokeId() === invitationId ? null : invitationId)
    }

    async revokeClerkInvitation(invitationId: string): Promise<void> {
        if (!this.isGroupOwner || !this.groupData || this.pendingClerkRevokeId() !== invitationId || this.isLoading()) return
        this.isLoading.set(true)

        try {
            await firstValueFrom(this.api.revokeClerkGroupInvitation(this.groupData.id, invitationId))
            this.pendingClerkRevokeId.set(null)
            this.toastService.success('Email invitation revoked')
            await this.refreshClerkInvitations(this.groupData.id)
        } catch {
            this.toastService.error('Error revoking email invitation')
        } finally {
            this.isLoading.set(false)
        }
    }

    async copyClerkInvitationLink() {
        const url = this.clerkInvitation()?.url
        if (!url) return
        if (!navigator.clipboard) {
            this.copyLinkStatus.set('unavailable')
            return
        }

        try {
            await navigator.clipboard.writeText(url)
            this.copyLinkStatus.set('copied')
        } catch {
            this.copyLinkStatus.set('failed')
        }
    }

    /** Removes a member at once, after its inline confirmation. */
    async removeMember(accountId: number): Promise<void> {
        if (!this.isGroupOwner || !this.groupData || this.isLoading()) return
        this.isLoading.set(true)
        try {
            await firstValueFrom(this.dataService.removeMemberFromGroup(this.groupData.id, accountId))
            this.pendingRemoval.set(null)
        } catch {
            // The service explains the error; the confirmation stays open for a retry.
        } finally {
            this.isLoading.set(false)
        }
    }

    /** Withdraws a pending in-app invitation, after its inline confirmation. */
    async withdrawInvitation(invitationId: number): Promise<void> {
        if (!this.isGroupOwner || this.isLoading()) return
        this.isLoading.set(true)
        try {
            await firstValueFrom(this.dataService.removeInvitedFromGroup(invitationId))
            this.pendingRemoval.set(null)
        } catch {
            // The service explains the error; the confirmation stays open for a retry.
        } finally {
            this.isLoading.set(false)
        }
    }

    onDeleteGroup() {
        if (!this.isGroupOwner || !this.groupData) return
        this.isDeleteDialogOpen.set(true)
    }

    public cancelDeleteGroup(): void {
        if (this.isDeletingGroup()) return
        this.isDeleteDialogOpen.set(false)
    }

    public async confirmDeleteGroup(): Promise<void> {
        if (!this.isGroupOwner || !this.groupData || this.isDeletingGroup()) return

        this.isDeletingGroup.set(true)
        try {
            await firstValueFrom(this.dataService.deleteGroup(this.groupData.id))
            await this.router.navigate(['/dashboard'])
        } finally {
            this.isDeletingGroup.set(false)
        }
    }
}

function httpStatus(error: unknown): number | undefined {
    return error instanceof HttpErrorResponse ? error.status : undefined
}
