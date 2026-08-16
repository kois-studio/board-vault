import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router, RouterLink } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { GameType } from '../../../api/api.types'
import { CardAccountComponent } from '../../../components/card-account/card-account.component'
import { ImageProfileComponent } from '../../../components/image-profile/image-profile.component'
import { DataService } from '../../../core/services/data.service'

@Component({
    imports: [CommonModule, RouterLink, ImageProfileComponent, ReactiveFormsModule, CardAccountComponent],
    templateUrl: 'group-edit.component.html',
})
export class GroupEditComponent {
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
    public isLoading = false

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()
            this.invitationsGroupIndex = this.dataService.invitationsGroupIndex()

            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
            const groupData = this.userGroups.find(group => group.id === groupId)

            if (Number.isNaN(groupId) || !this.userData || !groupData) {
                return
            }

            this.groupData = groupData
        })
    }

    get username() {
        return this.usernameToInvite.get('username')
    }

    get usernameClass() {
        if (!this.usernameToInvite.dirty && !this.usernameToInvite.touched) return ''
        return this.usernameToInvite.valid ? 'border-green-500' : 'border-red-500'
    }

    get disableInviteButton() {
        if (!this.groupData || !this.usernameToInvite.value) {
            return true
        }
        const usernames = this.groupData.members.map(member => member.username)

        const isUserAlreadyInGroup = usernames.includes(this.usernameToInvite.value)
        const isUserAlreadyInvited = (this.invitationsGroupIndex[this.groupData.id] ?? []).some(
            invitation => invitation.toAccount.username === this.usernameToInvite.value,
        )
        return this.isLoading || this.usernameToInvite.invalid || isUserAlreadyInGroup || isUserAlreadyInvited
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
            this.membersToRemoveFromGroup = this.membersToRemoveFromGroup.filter(id => id !== accountId)
        } else {
            this.membersToRemoveFromGroup.push(accountId)
        }
    }

    async onInviteUser() {
        if (!this.groupData || !this.userData || !this.usernameToInvite.value || this.isLoading) return
        this.isLoading = true

        try {
            await firstValueFrom(this.dataService.addInvitedToGroup(this.groupData.id, this.usernameToInvite.value))
            this.usernameToInvite.reset()
        } catch {
            // DataService presents the request error; keep the entered username available for retry.
        } finally {
            this.isLoading = false
        }
    }

    async onSaveChanges() {
        if (!this.groupData || !this.userData || this.isLoading) return
        this.isLoading = true

        try {
            const invitations = this.invitationsGroupIndex[this.groupData.id] ?? []
            const operations = this.membersToRemoveFromGroup.map(accountId => {
                const invitation = invitations.find(invitation => invitation.toAccount.id === accountId)
                return invitation
                    ? firstValueFrom(this.dataService.removeInvitedFromGroup(invitation.id))
                    : firstValueFrom(this.dataService.removeMemberFromGroup(this.groupData!.id, accountId))
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
        if (!this.groupData) return
        this.router.navigate(['/groups', this.groupData.id, 'delete'])
    }
}
