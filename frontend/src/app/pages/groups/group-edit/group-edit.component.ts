import { HttpErrorResponse } from '@angular/common/http'
import { afterNextRender, Component, computed, DestroyRef, ElementRef, effect, Injector, inject, signal, untracked } from '@angular/core'
import { takeUntilDestroyed } from '@angular/core/rxjs-interop'
import { FormControl, ReactiveFormsModule } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../../api/api'
import { GroupPersonWorkspaceType } from '../../../api/api.types'
import { CardAccountComponent } from '../../../components/card-account/card-account.component'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { BackLinkComponent } from '../../../components/ui/back-link/back-link.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { DialogDirective } from '../../../components/ui/dialog/dialog.directive'
import { IconComponent } from '../../../components/ui/icon/icon.component'
import { isPending } from '../../../core/async/resource-state'
import { DataService } from '../../../core/services/data.service'
import { groupGameCount, groupPeopleCount } from '../../../core/utils/groupCounts'
@Component({
    imports: [
        BackLinkComponent,
        ButtonComponent,
        RouterLink,
        ImageProfileComponent,
        ReactiveFormsModule,
        CardAccountComponent,
        DialogDirective,
        IconComponent,
    ],
    templateUrl: 'group-edit.component.html',
})
export class GroupEditComponent {
    private readonly api = inject(Api)
    private readonly destroyRef = inject(DestroyRef)
    private readonly injector = inject(Injector)
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef)
    /** From the address, so the way back works before the group has loaded. */
    protected readonly groupId = inject(ActivatedRoute).snapshot.paramMap.get('groupId')
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
    /** The username of the person to invite: people are invited by username only (#277). */
    public readonly inviteTarget = new FormControl('', { nonNullable: true })
    public readonly inviteError = signal<string | null>(null)
    public readonly groupPeople = signal<Array<GroupPersonWorkspaceType>>([])
    public readonly selectedClaimPersonId = signal<number | null>(null)
    /** The group's people are on their way, so it isn't known yet who can be linked to an invitation. */
    public readonly peopleLoading = signal(false)
    /** The group's people couldn't be loaded, so an invitation can't be linked to someone without an account. */
    public readonly peopleError = signal(false)
    /**
     * The group whose people were asked for: once per visit, as the page serves one group (its id is read from
     * the address once). The page's effect runs again on every change to your groups or invitations (sending one,
     * removing a member), and none of those change who can be linked, so they ask for nothing more (#257).
     */
    private loadedPeopleGroupId: number | null = null
    /** The person asked for in the address is picked once; after an invitation is sent, the menu stays cleared. */
    private requestedClaimPersonApplied = false
    /** "Invite" on a person without an account opens this page for them (?person=<id>). */
    private readonly requestedClaimPersonId = Number(inject(ActivatedRoute).snapshot.queryParamMap.get('person')) || null
    /** Coming to invite a particular person: wait for the people, or the invitation would not be linked to them. */
    public readonly inviteWaitsForPeople = computed(
        () => this.requestedClaimPersonId !== null && (this.peopleLoading() || this.peopleError()),
    )
    /** People without an account an invitation can hand over (ADR-0010: the invitee reviews and claims). */
    public readonly claimablePeople = computed(() =>
        this.groupPeople().filter(({ person }) => person.kind === 'placeholder' && person.status === 'active'),
    )
    public readonly isDeleteDialogOpen = signal(false)
    public readonly isDeletingGroup = signal(false)
    public readonly isResolvingGroup = signal(true)
    public readonly groupResolutionError = signal(false)
    /** Your groups could not be loaded, so whether this one is yours is unknown: never "not available" then (#248). */
    public readonly groupLoadFailed = computed(() => this.dataService.userGroupsState().status === 'error')
    public readonly isLoading = signal(false)

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
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

            const isLoadingGroups = isPending(this.dataService.userGroupsState())
            if (isLoadingGroups) return

            if (this.dataService.userGroupsState().status === 'error' || !groupData) {
                this.isResolvingGroup.set(false)
                this.groupResolutionError.set(true)
                return
            }

            this.groupData = groupData
            this.isResolvingGroup.set(false)
            this.groupResolutionError.set(false)

            if (this.isGroupOwner && this.loadedPeopleGroupId !== groupData.id) {
                this.loadedPeopleGroupId = groupData.id
                // Untracked: the signals the load reads and writes must not run this effect again.
                untracked(() => this.loadGroupPeople(groupData.id, 'first'))
            }
        })
    }

    /** Back to "Loading…" while the groups load again: the effect resolves it, never "not available" meanwhile. */
    public retryGroups(): void {
        this.groupResolutionError.set(false)
        this.isResolvingGroup.set(true)
        this.dataService.refreshUserGroups()
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
        if (!value) return $localize`:Error under the invite field on the group's settings page, when it is empty:Enter their username.`
        if (value.includes('@'))
            return $localize`:Error under the invite field on the group's settings page, when it holds an email address:Use their Board Vault username, not their email. Ask them for it if you don't know it.`
        if (value.length < 4 || value.length > 20)
            return $localize`:Error under the invite field on the group's settings page:Usernames have 4 to 20 characters.`
        const group = this.groupData
        if (group?.members.some((member) => member.username.toLowerCase() === value.toLowerCase()))
            return $localize`:Error under the invite field on the group's settings page:They are already in this group.`
        if (
            (this.invitationsGroupIndex[group?.id ?? -1] ?? []).some(
                (invitation) => invitation.toAccount.username.toLowerCase() === value.toLowerCase(),
            )
        ) {
            return $localize`:Error under the invite field on the group's settings page:They already have an invitation waiting.`
        }
        return null
    }

    public onInviteSubmit(event: SubmitEvent): void {
        event.preventDefault()
        this.inviteTarget.markAsTouched()
        if (this.inviteProblem() !== null || this.inviteWaitsForPeople()) return
        void this.onInviteUser()
    }

    get peopleCount(): number {
        return this.groupData ? groupPeopleCount(this.groupData) : 0
    }

    /** Distinct games anyone in the group owns, members or people without an account. */
    get gameCount(): number {
        return this.groupData ? groupGameCount(this.groupData) : 0
    }

    public confirmRemoveLabel(name: string): string {
        return $localize`:Name of the confirmation on the group's settings page before removing a member; the placeholder is their name:Confirm removing ${name}:name:`
    }

    async onInviteUser() {
        const username = this.inviteTarget.value.trim()
        if (!this.isGroupOwner || !this.groupData || !username || this.isLoading()) return
        this.isLoading.set(true)
        this.inviteError.set(null)

        try {
            await firstValueFrom(this.dataService.addInvitedToGroup(this.groupData.id, username, this.selectedClaimPersonId()))
            this.inviteTarget.reset()
            this.selectedClaimPersonId.set(null)
        } catch (error) {
            this.inviteError.set(
                httpStatus(error) === 404
                    ? $localize`:Error under the invite field on the group's settings page, after sending:No Board Vault account has this username. Check it and try again; your entry is still here.`
                    : $localize`:Error under the invite field on the group's settings page, after sending:We could not send this invite. Check the username and try again; your entry is still here.`,
            )
        } finally {
            this.isLoading.set(false)
        }
    }

    /** Loads the group's people again after it failed, keeping the message until the answer comes. */
    public retryGroupPeople(): void {
        if (!this.groupData || this.peopleLoading()) return
        this.loadGroupPeople(this.groupData.id, 'retry')
    }

    /** Shows that the people are loading and says when they fail; after a retry, focus moves on once they load. */
    private loadGroupPeople(groupId: number, mode: 'first' | 'retry'): void {
        const loader = this.api.getGroupPeople
        if (typeof loader !== 'function') return
        // Callers keep this to one load at a time: the effect asks once, and Retry waits for it. Leaving the page stops it.
        this.peopleLoading.set(true)
        loader
            .call(this.api, groupId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
                next: (response) => {
                    this.groupPeople.set(response.people)
                    this.peopleLoading.set(false)
                    this.peopleError.set(false)
                    const requested = this.requestedClaimPersonId
                    if (!this.requestedClaimPersonApplied && this.claimablePeople().some(({ person }) => person.id === requested)) {
                        this.requestedClaimPersonApplied = true
                        this.selectedClaimPersonId.set(requested)
                    }
                    if (mode === 'retry') this.#focusAfterRetry()
                },
                error: () => {
                    this.peopleLoading.set(false)
                    this.groupPeople.set([])
                    this.peopleError.set(true)
                },
            })
    }

    /** The Retry button goes away once the people load: put focus on the person menu, or the invite field. */
    #focusAfterRetry(): void {
        afterNextRender(
            () => {
                if (this.destroyRef.destroyed) return
                const active = document.activeElement
                if (active !== null && active !== document.body) return
                const host = this.host.nativeElement
                const target = host.querySelector<HTMLElement>('#group-invite-person') ?? host.querySelector<HTMLElement>('#group-invite')
                target?.focus()
            },
            { injector: this.injector },
        )
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
        } catch {
            // The data service already said why in a toast; nothing is left unhandled (#247).
        } finally {
            this.isDeletingGroup.set(false)
        }
    }
}

function httpStatus(error: unknown): number | undefined {
    return error instanceof HttpErrorResponse ? error.status : undefined
}
