import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { DataService } from '../../core/services/data.service'
import { UserService } from '../../core/services/user.service'
import { GameType } from '../../types/game.type'

@Component({
    standalone: true,
    imports: [ImageProfileComponent],
    selector: 'group-edit',
    templateUrl: 'group-edit.component.html',
})
export class GroupEditComponent {
    public userData: ReturnType<typeof this.userService.currentUser> = null
    public userGroups: ReturnType<typeof this.userService.userGroups> = []
    public groupMembersIndex: ReturnType<typeof this.dataService.groupMembersIndex> = {}
    public membersIndex: ReturnType<typeof this.dataService.membersIndex> = {}
    public gamesIndex: ReturnType<typeof this.dataService.gamesIndex> = {}
    public groupData: null | (typeof this.userGroups)[number] = null

    constructor(
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

    onCancel() {
        this.router.navigate(['/dashboard'])
    }
}
