import { Component, effect, inject, signal } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import { ClerkGroupInvitationSummaryType, ClerkGroupInvitationType, GameType, GroupPersonWorkspaceType } from '../../../api/api.types'
import { CardAccountComponent } from '../../../components/card-account/card-account.component'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { ToastService } from '../../../components/toast/toast.service'
import { DialogDirective } from '../../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { CustomDatePipe } from '../../../core/pipes/customDate.pipe'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [RouterLink, ImageProfileComponent, ReactiveFormsModule, CardAccountComponent, CustomDatePipe, DialogDirective, IconComponent],
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
    public membersToRemoveFromGroup: Array<number> = []
    public usernameToInvite = new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(20)])
    public emailToInvite = new FormControl('', [Validators.required, Validators.email, Validators.maxLength(320)])
    public clerkInvitation: ClerkGroupInvitationType | null = null
    public readonly clerkPendingInvitations = signal<Array<ClerkGroupInvitationSummaryType>>([])
    public readonly clerkInvitationsLoading = signal(false)
    public readonly clerkInvitationsError = signal(false)
    public readonly existingInvitationError = signal<string | null>(null)
    public readonly newPersonInvitationError = signal<string | null>(null)
    public readonly pendingClerkRevokeId = signal<string | null>(null)
    public readonly groupPeople = signal<Array<GroupPersonWorkspaceType>>([])
    public readonly selectedClaimPersonId = signal<number | null>(null)
    public readonly isDeleteDialogOpen = signal(false)
    public readonly isDeletingGroup = signal(false)
    public readonly isResolvingGroup = signal(true)
    public readonly groupResolutionError = signal(false)
    public copyLinkStatus: 'idle' | 'copied' | 'unavailable' | 'failed' = 'idle'
    public isLoading = false
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

    get username() {
        return this.usernameToInvite
    }

    get usernameClass() {
        if (!this.usernameToInvite.dirty && !this.usernameToInvite.touched) return ''
        return this.usernameToInvite.valid ? 'border-green-500' : 'border-red-500'
    }

    get isGroupOwner() {
        return !!this.groupData && !!this.userData && this.groupData.createdBy === this.userData.id
    }

    public getPendingAccountInvitations(groupId: number) {
        return this.invitationsGroupIndex[groupId] ?? []
    }

    get disableInviteButton() {
        if (!this.groupData || !this.usernameToInvite.value) {
            return true
        }
        const usernames = this.groupData.members.map((member) => member.username)

        const isUserAlreadyInGroup = usernames.includes(this.usernameToInvite.value)
        const isUserAlreadyInvited = (this.invitationsGroupIndex[this.groupData.id] ?? []).some(
            (invitation) => invitation.toAccount.username === this.usernameToInvite.value,
        )
        return this.isLoading || this.usernameToInvite.invalid || isUserAlreadyInGroup || isUserAlreadyInvited
    }

    public onInviteUserSubmit(event: SubmitEvent): void {
        event.preventDefault()
        void this.onInviteUser()
    }

    public onInviteNewPersonSubmit(event: SubmitEvent): void {
        event.preventDefault()
        void this.onInviteNewPerson()
    }

    get totalGames(): Array<GameType> {
        if (!this.groupData) {
            return []
        }

        // index all games by gameId so we don't duplicate games
        const games: Record<GameType['id'], GameType> = {}

        for (const member of this.groupData.members) {
            for (const game of member.games) {
                games[game.id] = game
            }
        }

        return Object.values(games)
    }

    markAsToRemove(accountId: number) {
        if (this.membersToRemoveFromGroup.includes(accountId)) {
            this.membersToRemoveFromGroup = this.membersToRemoveFromGroup.filter((id) => id !== accountId)
        } else {
            this.membersToRemoveFromGroup.push(accountId)
        }
    }

    async onInviteUser() {
        if (!this.isGroupOwner || !this.groupData || !this.usernameToInvite.value || this.isLoading) return
        this.isLoading = true
        this.existingInvitationError.set(null)

        try {
            await firstValueFrom(
                this.dataService.addInvitedToGroup(this.groupData.id, this.usernameToInvite.value, this.selectedClaimPersonId()),
            )
            this.usernameToInvite.reset()
        } catch {
            this.existingInvitationError.set('We could not send this invite. Check the username and try again; your entry is still here.')
        } finally {
            this.isLoading = false
        }
    }

    async onInviteNewPerson() {
        if (!this.isGroupOwner || !this.groupData || !this.emailToInvite.value || this.emailToInvite.invalid || this.isLoading) return
        this.isLoading = true
        this.clerkInvitation = null
        this.copyLinkStatus = 'idle'
        this.newPersonInvitationError.set(null)

        try {
            this.clerkInvitation = await firstValueFrom(
                this.dataService.inviteNewPersonToGroup(this.groupData.id, this.emailToInvite.value, this.selectedClaimPersonId()),
            )
            this.emailToInvite.reset()
            await this.refreshClerkInvitations(this.groupData.id)
        } catch {
            this.newPersonInvitationError.set(
                'We could not send the email invitation. Check the address and try again; your entry is still here.',
            )
        } finally {
            this.isLoading = false
        }
    }

    private loadGroupPeople(groupId: number): void {
        const loader = this.api.getGroupPeople
        if (typeof loader !== 'function') return
        loader
            .call(this.api, groupId)
            .subscribe({ next: (response) => this.groupPeople.set(response.people), error: () => this.groupPeople.set([]) })
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
        if (!this.isGroupOwner || !this.groupData || this.pendingClerkRevokeId() !== invitationId || this.isLoading) return
        this.isLoading = true

        try {
            await firstValueFrom(this.api.revokeClerkGroupInvitation(this.groupData.id, invitationId))
            this.pendingClerkRevokeId.set(null)
            this.toastService.success('Email invitation revoked')
            await this.refreshClerkInvitations(this.groupData.id)
        } catch {
            this.toastService.error('Error revoking email invitation')
        } finally {
            this.isLoading = false
        }
    }

    async copyClerkInvitationLink() {
        if (!this.clerkInvitation?.url) return
        if (!navigator.clipboard) {
            this.copyLinkStatus = 'unavailable'
            return
        }

        try {
            await navigator.clipboard.writeText(this.clerkInvitation.url)
            this.copyLinkStatus = 'copied'
        } catch {
            this.copyLinkStatus = 'failed'
        }
    }

    async onSaveChanges() {
        if (!this.isGroupOwner || !this.groupData || this.isLoading) return
        this.isLoading = true
        const groupData = this.groupData

        try {
            const invitations = this.invitationsGroupIndex[groupData.id] ?? []
            const operations = this.membersToRemoveFromGroup.map((accountId) => {
                const invitation = invitations.find((invitation) => invitation.toAccount.id === accountId)
                return invitation
                    ? firstValueFrom(this.dataService.removeInvitedFromGroup(invitation.id))
                    : firstValueFrom(this.dataService.removeMemberFromGroup(groupData.id, accountId))
            })

            await Promise.all(operations)
            this.membersToRemoveFromGroup = []
        } catch {
            // Individual services present the request error; keep selections for a retry.
        } finally {
            this.isLoading = false
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
