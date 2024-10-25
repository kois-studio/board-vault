import { CommonModule } from '@angular/common'
import { Component, Input, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { GameType } from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { CardGameComponent } from '../../components/card-game/card-game.component'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CardAccountComponent, CommonModule, CardGameComponent],
    templateUrl: 'meet-new.component.html',
})
export class MeetNewComponent {
    private userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    public groupData: null | (typeof this.userGroups)[number] = null

    public selectedUserIds: number[] = []

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()

            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
            const groupData = this.userGroups.find((group) => group.id === groupId)

            if (Number.isNaN(groupId) || !this.userData || !groupData) {
                return
            }

            this.groupData = groupData
        })
    }

    get totalGames(): Array<GameType> {
        // index all games by gameId so we don't duplicate games
        const games: Record<GameType['id'], GameType> = {}

        if (!this.groupData) {
            return []
        }

        for (const member of this.groupData.members) {
            if (this.selectedUserIds.includes(member.id)) {
                for (const game of member.games) {
                    games[game.id] = game
                }
            }
        }

        return Object.values(games)
    }

    public onClickMember(memberId: number) {
        if (this.selectedUserIds.includes(memberId)) {
            this.selectedUserIds = this.selectedUserIds.filter((id) => id !== memberId)
        } else {
            this.selectedUserIds.push(memberId)
        }
    }

    onGoBack() {
        this.router.navigate(['/dashboard'])
    }
}
