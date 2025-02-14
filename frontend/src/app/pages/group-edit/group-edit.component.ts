import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { ActivatedRoute, Router } from '@angular/router'
import { GameType } from '../../api/api.types'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [CommonModule, ImageProfileComponent, ReactiveFormsModule],
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
            const groupData = this.userGroups.find((group) => group.id === groupId)

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
        const usernames = this.groupData.members.map((member) => member.username)

        const isUserAlreadyInGroup = usernames.includes(this.usernameToInvite.value)
        const isUserAlreadyInvited = this.invitationsGroupIndex[this.groupData.id].some(
            (invitation) => invitation.toAccount.username === this.usernameToInvite.value,
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
            this.membersToRemoveFromGroup = this.membersToRemoveFromGroup.filter((id) => id !== accountId)
        } else {
            this.membersToRemoveFromGroup.push(accountId)
        }
    }

    onGoBack() {
        this.router.navigate(['/dashboard'])
    }

    onInviteUser() {
        if (!this.groupData || !this.userData || !this.usernameToInvite.value) return
        this.isLoading = true

        this.dataService.addInvitedToGroup(this.groupData.id, this.userData.id, this.usernameToInvite.value)

        // clear input
        this.usernameToInvite.reset()
        this.isLoading = false
    }

    onSaveChanges() {
        if (!this.groupData || !this.userData) return
        this.isLoading = true

        for (const accountId of this.membersToRemoveFromGroup) {
            // 1. its being removed from invited zone
            const invitations = this.invitationsGroupIndex[this.groupData.id]
            const invitation = invitations.find((invitation) => invitation.toAccount.id === accountId)
            if (invitation) {
                this.dataService.removeInvitedFromGroup(invitation.id)
                continue
            }

            // 2. its being removed from the group members
            this.dataService.removeMemberFromGroup(this.groupData.id, accountId)
        }

        // clear selection
        this.membersToRemoveFromGroup = []
        this.isLoading = false
    }

    onDeleteGroup() {
        if (!this.groupData) return
        this.router.navigate(['/group', this.groupData.id, 'delete'])
    }
}
