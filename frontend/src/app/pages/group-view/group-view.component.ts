import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { GameType } from '../../api/api.types'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { TitleSubtitleComponent } from '../../components/ui/title-subtitle/title-subtitle.component'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [ImageProfileComponent, TitleSubtitleComponent, ContainerWrapperComponent],
    templateUrl: 'group-view.component.html',
})
export class GroupViewComponent {
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    private userData: ReturnType<typeof this.dataService.currentUser> = null
    private userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public invitationsGroupIndex: ReturnType<typeof this.dataService.invitationsGroupIndex> = {}

    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupData: null | (typeof this.userGroups)[number] = null
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

    onGoBack() {
        this.router.navigate(['/dashboard'])
    }
}
