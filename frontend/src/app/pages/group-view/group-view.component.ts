import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { Api } from '../../api/api'
import type { GameType, GroupWithMembersAndGames, MeetWithAttendeesAndGamesType, UserType } from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { ImageProfileComponent } from '../../components/image-profile/image-profile.component'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { ReviewDisplayComponent } from '../../components/ui/review-display/review-display.component'
import { TitleSubtitleComponent } from '../../components/ui/title-subtitle/title-subtitle.component'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'

@Component({
    standalone: true,
    imports: [
        TitleSubtitleComponent,
        ContainerWrapperComponent,
        CardAccountComponent,
        CommonModule,
        CustomDatePipe,
        ImageProfileComponent,
        ImageBackgroundComponent,
        ReviewDisplayComponent,
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
    public selectedUserIds: number[] = []
    public groupData: null | (typeof this.userGroups)[number] = null
    public gameReviews: Record<GameType['id'], Record<UserType['id'], number>> = {}
    public avgReviewsIndex: Record<GameType['id'], { average: number; voters: number }> = {}
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
            this.selectedUserIds = groupData.members.map((member) => member.id)

            // After getting group data, index all reviews by gameId
            this._indexReviews(groupData)

            // Get the group meetings data (with its members and games)
            this.api.getGroupMeetings(groupId).subscribe({
                next: (groupMeetings) => {
                    this.groupMeetings = groupMeetings.sort((a, b) => {
                        return new Date(b.meetDate).getTime() - new Date(a.meetDate).getTime()
                    })
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
            this.avgReviewsIndex[Number(gameId)] = {
                average: Number((sum / reviews.length).toFixed(2)),
                voters: reviews.length,
            }
        }
    }

    // #region Getters

    get totalUniqueGames(): Array<
        GameType & {
            quantity: number // number of copies of the game in the group
            active: boolean // to highlight or not in the UI
        }
    > {
        const games: Array<GameType & { quantity: number; active: boolean }> = []

        if (!this.groupData) {
            return []
        }

        for (const member of this.groupData.members) {
            // add the games of the non-selected members as inactive
            if (!this.selectedUserIds.includes(member.id)) {
                for (const game of member.games) {
                    const gameObject = games.find((g) => g.id === game.id)
                    if (!gameObject) {
                        games.push({ ...game, active: false, quantity: 1 })
                    } else {
                        gameObject.quantity++
                    }
                }
            }
            // add the games of the selected members as active
            else {
                for (const game of member.games) {
                    const gameObject = games.find((g) => g.id === game.id)
                    if (!gameObject) {
                        games.push({ ...game, active: true, quantity: 1 })
                    } else {
                        // if was already added, simply update the active flag
                        const index = games.findIndex((g) => g.id === game.id)
                        games[index].active = true
                        games[index].quantity++
                    }
                }
            }
        }

        return games.sort((a, b) => {
            const a_review = this.avgReviewsIndex[a.id]?.average ?? -1
            const b_review = this.avgReviewsIndex[b.id]?.average ?? -1
            return b_review - a_review
        })
    }

    // #region Parse Data

    parseAttendeeIds(memberIds: Array<UserType['id']>): Array<UserType> {
        const result = memberIds
            .map((memberId) => this.groupData?.members.find((member) => member.id === memberId) || null)
            .filter((member) => member !== null)

        // If > 5 members, we will show [1,2,3,4, +n] in the HTML, so we only return the first 4
        //      if 6 -> [1,2,3,4, +2]
        //      if 7 -> [1,2,3,4, +3]
        if (memberIds.length > 5) {
            return result.slice(0, 4)
        }

        return result
    }

    parseGameIds(gameIds: Array<GameType['id']>): Array<GameType> {
        return gameIds.map((gameId) => this.totalUniqueGames.find((game) => game.id === gameId)).filter((game) => game !== undefined)
    }

    // #region Button Clicks

    onClickMeeting(meetId: number): void {
        this.router.navigate(['/meets', meetId])
    }

    onClickMember(memberId: number) {
        if (this.selectedUserIds.includes(memberId)) {
            this.selectedUserIds = this.selectedUserIds.filter((id) => id !== memberId)
        } else {
            this.selectedUserIds.push(memberId)
        }
    }

    onClickEditGroup() {
        this.router.navigate(['/group', this.groupData?.id, 'edit'])
    }

    onClickLeaveGroup() {
        this.router.navigate(['/group', this.groupData?.id, 'leave'])
    }

    onClickNewMeet(): void {
        this.router.navigate(['/group', this.groupData?.id, 'meets', 'new'])
    }

    onGoBack() {
        this.router.navigate(['/dashboard'])
    }
}
