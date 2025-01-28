import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Api } from '../../api/api'
import type { GameType, GroupWithMembersAndGames, MeetWithAttendeesAndGamesType, UserType } from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { CardGameComponent } from '../../components/card-game/card-game.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { TitleSubtitleComponent } from '../../components/ui/title-subtitle/title-subtitle.component'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [
        TitleSubtitleComponent,
        ContainerWrapperComponent,
        CardAccountComponent,
        CardGameComponent,
        CommonModule,
        CustomDatePipe,
        ImageProfileComponent,
        ImageBackgroundComponent,
    ],
    templateUrl: 'group-view.component.html',
    styleUrls: ['group-view.component.scss'],
})
export class GroupViewComponent {
    // --------------------------------------------------------------------------
    //        DATA from services
    // --------------------------------------------------------------------------
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    private userGroups: ReturnType<typeof this.dataService.userGroups> = []
    userMeets: ReturnType<typeof this.dataService.userMeets> = []
    public invitationsGroupIndex: ReturnType<typeof this.dataService.invitationsGroupIndex> = {}

    // --------------------------------------------------------------------------
    //        DATA for this component
    // --------------------------------------------------------------------------
    public groupData: null | (typeof this.userGroups)[number] = null
    public gameReviews: Record<GameType['id'], Record<UserType['id'], number>> = {}
    public avgReviewsIndex: Record<GameType['id'], number> = {}
    public groupMeetings: Array<MeetWithAttendeesAndGamesType> = []
    public isLoading = false

    constructor(
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
        private readonly api: Api,
    ) {
        effect(() => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()
            this.userMeets = this.dataService.userMeets()
            this.invitationsGroupIndex = this.dataService.invitationsGroupIndex()

            const groupId = Number.parseInt(this.route.snapshot.paramMap.get('groupId') || '')
            const groupData = this.userGroups.find((group) => group.id === groupId)

            if (Number.isNaN(groupId) || !this.userData || !groupData) {
                return
            }

            this.groupData = groupData

            // After getting group data, index all reviews by gameId
            this._indexReviews(groupData)

            // Get the group meetings data (with its members and games)
            this.api.getGroupMeetings(groupId).subscribe({
                next: (groupMeetings) => {
                    this.groupMeetings = groupMeetings
                },
                error: (error) => {
                    console.error(error)
                },
            })
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

        return Object.values(games).sort((a, b) => {
            const a_review = this.avgReviewsIndex[a.id] ?? -1
            const b_review = this.avgReviewsIndex[b.id] ?? -1
            return b_review - a_review
        })
    }

    parseAttendeeIds(memberIds: Array<UserType['id']>): Array<UserType> {
        return memberIds
            .map((memberId) => this.groupData?.members.find((member) => member.id === memberId) || null)
            .filter((member) => member !== null)
    }

    parseGameIds(gameIds: Array<GameType['id']>): Array<GameType> {
        return gameIds.map((gameId) => this.totalGames.find((game) => game.id === gameId)).filter((game) => game !== undefined)
    }

    onGoBack() {
        this.router.navigate(['/dashboard'])
    }
}
