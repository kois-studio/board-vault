import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { GameType, UserType } from '../../api/api.types'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { TitleSubtitleComponent } from '../../components/ui/title-subtitle/title-subtitle.component'
import { DataService } from '../../core/services/data.service'

@Component({
    imports: [CommonModule, ImageProfileComponent, ContainerWrapperComponent, TitleSubtitleComponent],
    templateUrl: 'reviews.component.html',
})
export class ReviewComponent {
    // From dataService
    public userReviews: ReturnType<typeof this.dataService.userReviews> = []
    public userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public userData: UserType | null = null

    // Component props
    public allGroupGames: Record<
        GameType['id'],
        {
            data: GameType
            owners: Array<UserType['id']>
        }
    > = {}
    public hoverRating: Record<GameType['id'], number> = {}

    constructor(private readonly dataService: DataService) {
        effect(() => {
            this.userReviews = this.dataService.userReviews()
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()

            // from each group, get all the games
            const userGroups = this.userGroups
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

    getOwnerData(ownerId: number): UserType | undefined {
        const group = this.userGroups.find((group) => group.members.find((member) => member.id === ownerId))
        const member = group?.members.find((member) => member.id === ownerId)
        return member // it 100% exists
    }

    get gamesList() {
        return Object.values(this.allGroupGames)
    }

    public getReview(gameId: number): number {
        return this.userReviews.find((review) => review.gameId === gameId)?.review ?? -1
    }

    public setReview(gameId: number, reviewValue: number) {
        const accountId = this.userData?.id
        if (accountId) {
            if (this.getReview(gameId) === -1) {
                this.dataService.createGameReview(accountId, gameId, reviewValue)
            } else {
                this.dataService.updateGameReview(accountId, gameId, reviewValue)
            }
        }
    }

    public deleteReview(gameId: number) {
        const accountId = this.userData?.id
        if (accountId) {
            this.dataService.deleteGameReview(accountId, gameId)
        }
    }
}
