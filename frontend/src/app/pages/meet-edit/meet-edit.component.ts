import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { GameType, GroupWithMembersAndGames, UserType } from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { CardGameComponent } from '../../components/card-game/card-game.component'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [CardAccountComponent, CommonModule, CardGameComponent],
    templateUrl: 'meet-edit.component.html',
})
export class MeetEditComponent {
    // DataService data
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    private userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public groupData: null | (typeof this.userGroups)[number] = null
    private userMeets: ReturnType<typeof this.dataService.userMeets> = []

    // Component state
    public selectedUserIds: number[] = []
    public gameReviews: Record<GameType['id'], Record<UserType['id'], number>> = {}
    public avgReviewsIndex: Record<GameType['id'], number> = {}
    public selectedGameIds: Array<number> = []

    // Component props
    public allGroupGames: Record<
        GameType['id'],
        {
            data: GameType
            owners: Array<UserType['id']>
        }
    > = {}

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()
            this.userMeets = this.dataService.userMeets()

            const meet = this.userMeets[0]
            if(!meet) return
            const groupData = this.userGroups.find((group) => group.id === meet.groupId)

            if (!this.userData || !groupData) return

            this.groupData = groupData

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

            // After getting group data, index all reviews by gameId
            this._indexReviews(groupData)
        })
    }

    private _indexReviews(groupData: GroupWithMembersAndGames) {
        // Step 1: Index all reviews by gameId and userId
        for (const member of groupData.members) {
            for (const review of member.reviews) {
                if (this.gameReviews[review.gameId] === undefined) {
                    this.gameReviews[review.gameId] = {}
                }

                this.gameReviews[review.gameId][member.id] = review.review
            }
        }

        // Step 2: Calculate average review for each game
        for (const [gameId, value] of Object.entries(this.gameReviews)) {
            const reviews = Object.values(value)
            const sum = reviews.reduce((acc, review) => acc + review, 0)
            this.avgReviewsIndex[Number(gameId)] = Number((sum / reviews.length).toFixed(2))
        }
    }

    get totalGames(): Array<GameType> {
        const games: Array<GameType> = []

        if (!this.groupData) {
            return []
        }

        for (const member of this.groupData.members) {
            if (this.selectedUserIds.includes(member.id)) {
                for (const game of member.games) {
                    if (!games.find((g) => g.id === game.id)) {
                        games.push(game)
                    }
                }
            }
        }

        return games.sort((a, b) => {
            const a_review = this.avgReviewsIndex[a.id] ?? -1
            const b_review = this.avgReviewsIndex[b.id] ?? -1
            return b_review - a_review
        })
    }

    public onClickMember(memberId: number) {
        if (this.selectedUserIds.includes(memberId)) {
            this.selectedUserIds = this.selectedUserIds.filter((id) => id !== memberId)
        } else {
            this.selectedUserIds.push(memberId)
        }
    }

    public onClickGame(gameId: number) {
        if (this.selectedGameIds.includes(gameId)) {
            this.selectedGameIds = this.selectedGameIds.filter((id) => id !== gameId)
        } else {
            this.selectedGameIds.push(gameId)
        }
    }

    public onSaveDraft() {
        const accountId = this.userMeets[0].id
        const groupId = this.userMeets[0].groupId
    
        if (accountId && groupId) {
            const selectedUsers = this.groupData?.members.filter((member) =>
                this.selectedUserIds.includes(member.id)
        )
        console.log(selectedUsers)
    
            const selectedGames = this.totalGames.filter((game) =>
                this.selectedGameIds.includes(game.id)
            )
        console.log(selectedGames)
    
            if (selectedGames.length > 0) {
                console.log('Selected Games:', selectedGames)
                // this.dataService.createMeeting(accountId, groupId)
            } else {
                console.error('No games selected')
            }
        }
    }

    onGoBack() {
        const groupId = this.userMeets[0].groupId
        
        this.router.navigate([`/group/${groupId}/meet/new`])
    }
}

