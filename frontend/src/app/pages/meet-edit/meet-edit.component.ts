import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { ActivatedRoute, Router } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameType, GroupWithMembersAndGames, MeetType, MeetWithAttendeesAndGamesType, UserType } from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { ReviewDisplayComponent } from '../../components/ui/review-display/review-display.component'
import { TitleSubtitleComponent } from '../../components/ui/title-subtitle/title-subtitle.component'
import { DataService } from '../../core/services/data.service'
import type { Nullable } from '../../core/types/commons.type'

/**
 * The idea with this is that it will become the "confirmation" to explain which games have been played and who finally attended the meeting.
 */
@Component({
    standalone: true,
    imports: [CardAccountComponent, CommonModule, TitleSubtitleComponent, ReviewDisplayComponent, ImageBackgroundComponent],
    templateUrl: 'meet-edit.component.html',
})
export class MeetEditComponent {
    // DataService data (filled on init -> effect)
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    private userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public groupData: Nullable<(typeof this.userGroups)[number]> = null
    public meetData: Nullable<MeetWithAttendeesAndGamesType> = null
    public meetDataCopyOriginal: Nullable<MeetWithAttendeesAndGamesType> = null // to compare changes

    // Component state
    public gameReviews: Record<GameType['id'], Record<UserType['id'], number>> = {}
    public avgReviewsIndex: Record<GameType['id'], number> = {}
    public selectedGameIds: Array<number> = []
    public lastMeeting: Nullable<MeetType> = null

    // Component props
    public allGroupGames: Record<
        GameType['id'],
        {
            data: GameType
            owners: Array<UserType['id']>
        }
    > = {}

    constructor(
        private readonly api: Api,
        private readonly router: Router,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
    ) {
        effect(async () => {
            this.userData = this.dataService.currentUser()
            this.userGroups = this.dataService.userGroups()

            // Get Meet Details
            const meetId = Number.parseInt(this.route.snapshot.paramMap.get('meetId') || '')

            this.meetData = await firstValueFrom(this.api.getMeetDetailsById(meetId))
            this.meetDataCopyOriginal = JSON.parse(JSON.stringify(this.meetData))

            if (!this.meetData) return

            // Group Data
            const groupData = this.userGroups.find((group) => group.id === this.meetData?.groupId)

            if (!this.userData || !groupData) return

            this.groupData = groupData

            // After getting group data, index all games by gameId
            for (const group of this.userGroups) {
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

    get totalGames(): Array<GameType & { active: boolean }> {
        const games: Array<GameType & { active: boolean }> = []

        if (!this.groupData) {
            return []
        }

        for (const member of this.groupData.members) {
            // add the games of the non-selected members as inactive
            if (!this.meetData?.attendees.includes(member.id)) {
                for (const game of member.games) {
                    if (!games.find((g) => g.id === game.id)) {
                        games.push({ ...game, active: false })
                    }
                }
            }
            // add the games of the selected members as active
            else {
                for (const game of member.games) {
                    if (!games.find((g) => g.id === game.id)) {
                        games.push({ ...game, active: true })
                    } else {
                        // if was already added, simply update the active flag
                        const index = games.findIndex((g) => g.id === game.id)
                        games[index].active = true
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
        if (!this.meetData) {
            return
        }

        if (this.meetData.attendees.includes(memberId)) {
            this.meetData.attendees = this.meetData.attendees.filter((id) => id !== memberId)
        } else {
            this.meetData.attendees.push(memberId)
        }
    }

    public onSaveAttendeesSelection() {
        if (!this.groupData || !this.meetData) {
            return
        }

        for (const member of this.groupData.members) {
            const isAttending = this.meetData.attendees.includes(member.id)
            const isAttendingOriginal = this.meetDataCopyOriginal?.attendees.includes(member.id)

            if (isAttending !== isAttendingOriginal) {
                this.dataService.updateMeetAttendee(this.meetData.id, member.id, isAttending)
            }
        }

        this.router.navigate([`/group/${this.groupData.id}`])

        // TODO: this will be done in a future `meet-confirmation` component
        // for (const games of this.totalGames) {
        //     const isPlaying = this.selectedGameIds.includes(games.id)

        //     this.dataService.updateMeetGame(this.meetData.id, games.id, isPlaying)
        // }
    }
}
