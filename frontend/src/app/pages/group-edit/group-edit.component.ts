import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { DataService } from '../../core/services/data.service'
import { UserService } from '../../core/services/user.service'
import { GameType } from '../../types/game.type'
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms'
import { Api } from '../../api/api'

@Component({
    standalone: true,
    imports: [CommonModule, ImageProfileComponent, ReactiveFormsModule],
    selector: 'group-edit',
    templateUrl: 'group-edit.component.html',
})
export class GroupEditComponent {
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    public userData: ReturnType<typeof this.userService.currentUser> = null
    public userGroups: ReturnType<typeof this.userService.userGroups> = []
    public groupMembersIndex: ReturnType<typeof this.dataService.groupMembersIndex> = {}
    public membersIndex: ReturnType<typeof this.dataService.membersIndex> = {}
    public gamesIndex: ReturnType<typeof this.dataService.gamesIndex> = {}

    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupData: null | (typeof this.userGroups)[number] = null
    public membersToRemoveFromGroup: Array<number> = []
    public usernameToInvite = new FormControl('', [Validators.required, Validators.minLength(4), Validators.maxLength(20)])
    public isLoading = false

    get disableSubmit() {
        if (!this.groupData || !this.usernameToInvite.value) {
            return true
        }
        const userIds = this.groupMembersIndex[this.groupData.groupId]
        const usernames = userIds.map((userId) => this.membersIndex[userId].username)

        const isUserAlreadyInGroup = usernames.includes(this.usernameToInvite.value)
        return this.isLoading || this.usernameToInvite.invalid || isUserAlreadyInGroup
    }

    get username() {
        return this.usernameToInvite.get('username')
    }

    get usernameClass() {
        if (!this.usernameToInvite.dirty && !this.usernameToInvite.touched) return ''
        return this.usernameToInvite.valid ? 'border-green-500' : 'border-red-500'
    }

    constructor(
        private readonly api: Api,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly userService: UserService,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userData = this.userService.currentUser()
            this.userGroups = this.userService.userGroups()
            this.groupMembersIndex = this.dataService.groupMembersIndex()
            this.membersIndex = this.dataService.membersIndex()
            this.gamesIndex = this.dataService.gamesIndex()

            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
            const groupData = this.userGroups.find((group) => group.groupId === groupId)

            if (Number.isNaN(groupId) || !this.userData || !groupData) {
                return
            }

            this.groupData = groupData
        })
    }

    get totalGames(): Array<GameType> {
        // index all games by gameId so we don't duplicate games
        const games: Record<GameType['id'], GameType> = {}

        for (const [accountId, gamesList] of Object.entries(this.gamesIndex)) {
            for (const game of gamesList) {
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

    onCancel() {
        this.router.navigate(['/dashboard'])
    }

    onInviteUser() {
        if (!this.groupData || !this.userData || !this.usernameToInvite.value) return
        this.isLoading = true

        this.api.createInvitation(this.groupData.groupId, this.userData?.id, this.usernameToInvite.value).subscribe({
            next: (res) => {
                this.isLoading = false
                this.usernameToInvite.reset()
                if (res.success) {
                    console.log('all good')
                } else {
                    console.log('bad request')
                }
                // this.dataService.refreshInvitations()
            },
            error: () => {
                this.isLoading = false
                this.usernameToInvite.reset()
            }
        })
        // 1. check if the user exists
        // 2. send the invitation (this already checks 1.)
        // 3. refresh in dataService everything needed
    }
}
