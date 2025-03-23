import { CommonModule } from '@angular/common'
import { Component, computed, effect, inject } from '@angular/core'
import { RouterLink } from '@angular/router'
import type { GameType, UserType } from '../../../api/api.types'
import { CardGameComponent } from '../../../components/card-game/card-game.component'
import { SkeletonCardGameComponent } from '../../../components/skeletons/skeleton-card-game/skeleton-card-game.component'
import { ButtonComponent } from '../../../components/ui/button/button.component'
import { ContainerWrapperComponent } from '../../../components/ui/container-wrapper/container-wrapper.component'
import { PageHeaderComponent } from '../../../components/ui/page-header/page-header.component'
import { LOADING_KEYS } from '../../../core/enums/loading-keys-enum'
import { DataService } from '../../../core/services/data.service'
import { LoadingService } from '../../../core/services/loading.service'

@Component({
    imports: [
        CommonModule,
        ContainerWrapperComponent,
        PageHeaderComponent,
        ButtonComponent,
        RouterLink,
        SkeletonCardGameComponent,
        CardGameComponent,
    ],
    templateUrl: 'reviews-page.component.html',
})
export class ReviewsPageComponent {
    private readonly dataService = inject(DataService)
    private readonly loadingService = inject(LoadingService)
    // --------------------------------------------------------------------------
    //        Services signals
    // --------------------------------------------------------------------------
    // dataService
    public readonly currentUser$ = this.dataService.currentUser
    public readonly userGroups$ = this.dataService.userGroups
    public readonly userReviews$ = this.dataService.userReviews
    public readonly userGroupUniqueGamesComputed = computed(() => {
        const allGames = this.userGroups$().flatMap((group) => group.members.flatMap((member) => member.games))
        return new Set(allGames)
    })
    // loadingService
    public readonly isLoadingReviews = computed(() => this.loadingService.loadingStatesIndex()[LOADING_KEYS.USER_REVIEWS])

    // Component props
    public allGroupGames: Record<
        GameType['id'],
        {
            data: GameType
            owners: Array<UserType['id']>
        }
    > = {}
    public hoverRating: Record<GameType['id'], number> = {}

    constructor() {
        effect(() => {
            // from each group, get all the games
            const userGroups = this.userGroups$()
            for (const group of userGroups) {
                for (const member of group.members) {
                    for (const game of member.games) {
                        if (!this.allGroupGames[game.id]) {
                            this.allGroupGames[game.id] = {
                                data: game,
                                owners: [member.id],
                            }
                        } else {
                            if (!this.allGroupGames[game.id].owners.includes(member.id)) {
                                this.allGroupGames[game.id].owners.push(member.id)
                            }
                        }
                    }
                }
            }
        })
    }

    public setReview(gameId: number, reviewValue: number) {
        const accountId = this.currentUser$()?.id
        if (accountId) {
            this.dataService.saveGameReview(accountId, gameId, reviewValue)
        }
    }
}
