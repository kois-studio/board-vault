import { CommonModule } from '@angular/common'
import { Component, effect } from '@angular/core'
import { ActivatedRoute } from '@angular/router'
import { firstValueFrom } from 'rxjs'
import { Api } from '../../api/api'
import type { GameType, GroupWithMembersAndGames, MeetType, MeetWithAttendeesAndGamesType, UserType } from '../../api/api.types'
import { CardAccountComponent } from '../../components/card-account/card-account.component'
import { ToastService } from '../../components/toast/toast.service'
import { ContainerWrapperComponent } from '../../components/ui/container-wrapper/container-wrapper.component'
import { ImageBackgroundComponent } from '../../components/ui/image-background/image-background.component'
import { TitleSubtitleComponent } from '../../components/ui/title-subtitle/title-subtitle.component'
import { CustomDatePipe } from '../../core/pipes/customDate.pipe'
import { DataService } from '../../core/services/data.service'
import type { Nullable } from '../../core/types/commons.type'

@Component({
    imports: [
        CommonModule,
        CustomDatePipe,
        CardAccountComponent,
        TitleSubtitleComponent,
        ImageBackgroundComponent,
        ContainerWrapperComponent,
    ],
    templateUrl: 'meet-view.component.html',
})
export class MeetViewComponent {
    public loaded = false

    // DataService data (filled on init -> effect)
    public userData: ReturnType<typeof this.dataService.currentUser> = null
    private userGroups: ReturnType<typeof this.dataService.userGroups> = []
    public groupData: Nullable<(typeof this.userGroups)[number]> = null
    public meetData: Nullable<MeetWithAttendeesAndGamesType> = null
    public meetDataCopyOriginal: Nullable<MeetWithAttendeesAndGamesType> = null // to compare changes

    // Component state
    public gameReviews: Record<GameType['id'], Record<UserType['id'], number>> = {}
    public avgReviewsIndex: Record<GameType['id'], number> = {}
    public lastMeeting: Nullable<MeetType> = null
    public isUpdatingStatus = false
    public isPersistingChanges = false

    constructor(
        private readonly api: Api,
        private readonly route: ActivatedRoute,
        private readonly dataService: DataService,
        private readonly toastService: ToastService,
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

            // After getting group data, index all reviews by gameId
            this.#indexReviews(groupData)

            this.loaded = true
        })
    }

    #indexReviews(groupData: GroupWithMembersAndGames): void {
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

    // #region Getters

    get disableSaveAttendees(): boolean {
        if (!this.meetData || !this.meetDataCopyOriginal) {
            return true
        }

        return JSON.stringify(this.meetData.attendees) === JSON.stringify(this.meetDataCopyOriginal.attendees)
    }

    get canManageLifecycle(): boolean {
        return Boolean(this.meetData && this.userData && this.meetData.createdBy === this.userData.id)
    }

    get canEditSession(): boolean {
        return this.meetData?.status === 'scheduled' || this.meetData?.status === 'active'
    }

    async updateStatus(status: 'active' | 'completed' | 'cancelled'): Promise<void> {
        if (!this.meetData || !this.canManageLifecycle || !this.canEditSession) return

        this.isUpdatingStatus = true
        try {
            const result = await firstValueFrom(this.api.updateSessionStatus(this.meetData.id, { status }))
            this.meetData.status = result.status
            this.meetDataCopyOriginal = JSON.parse(JSON.stringify(this.meetData))
            this.dataService.refreshUserMeets()
            this.toastService.success(`Session marked as ${status}.`)
        } catch {
            this.toastService.error('Could not update the session status.')
        } finally {
            this.isUpdatingStatus = false
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

    get plannedGames(): Array<GameType & { active: boolean }> {
        if (!this.meetData) return []
        const gamesById = new Map(this.totalGames.map(game => [game.id, game]))
        return this.meetData.plannedGames.map(gameId => gamesById.get(gameId)).filter((game): game is GameType & { active: boolean } => game !== undefined)
    }

    // #region Button Clicks
    // TODO: rethink the click system, it should be done with a straightforward click(id) instead of so much logic

    async onClickMember(memberId: number): Promise<void> {
        if (!this.meetData || !this.canEditSession || this.isPersistingChanges) {
            return
        }

        const previousAttendees = [...this.meetData.attendees]
        if (this.meetData.attendees.includes(memberId)) {
            this.meetData.attendees = this.meetData.attendees.filter((id) => id !== memberId)
        } else {
            this.meetData.attendees.push(memberId)
        }

        this.isPersistingChanges = true
        try {
            await this.#saveAttendeesSelection()
        } catch {
            this.meetData.attendees = previousAttendees
        } finally {
            this.isPersistingChanges = false
        }
    }

    async onClickGame(gameId: number): Promise<void> {
        if (!this.meetData || !this.canEditSession || this.isPersistingChanges) {
            return
        }

        const previousPlayedGames = [...this.meetData.playedGames]
        if (this.meetData.playedGames.includes(gameId)) {
            this.meetData.playedGames = this.meetData.playedGames.filter((id) => id !== gameId)
        } else {
            this.meetData.playedGames.push(gameId)
        }

        this.isPersistingChanges = true
        try {
            await this.#saveGamesPlayedSelection()
        } catch {
            this.meetData.playedGames = previousPlayedGames
        } finally {
            this.isPersistingChanges = false
        }
    }

    // #region private methods

    async #saveAttendeesSelection(): Promise<void> {
        if (!this.groupData || !this.meetData || !this.meetDataCopyOriginal) {
            return
        }

        for (const member of this.groupData.members) {
            const isAttending = this.meetData.attendees.includes(member.id)
            const isAttendingOriginal = this.meetDataCopyOriginal?.attendees.includes(member.id)

            if (isAttending !== isAttendingOriginal) {
                if (isAttending) {
                    await firstValueFrom(this.dataService.createMeetAttendee(this.meetData.id, member.id))
                } else {
                    await firstValueFrom(this.dataService.deleteMeetAttendee(this.meetData.id, member.id))
                }
            }
        }

        // update the original copy for future comparisons
        this.meetDataCopyOriginal.attendees = [...this.meetData.attendees]
    }

    async #saveGamesPlayedSelection(): Promise<void> {
        if (!this.userData || !this.groupData || !this.meetData || !this.meetDataCopyOriginal) {
            return
        }

        for (const game of this.totalGames) {
            const isPlaying = this.meetData.playedGames.includes(game.id)
            const isPlayingOriginal = this.meetDataCopyOriginal?.playedGames.includes(game.id)

            if (isPlaying !== isPlayingOriginal) {
                if (isPlaying) {
                    await firstValueFrom(this.dataService.createMeetAccountGame(this.userData.id, this.meetData.id, game.id))
                } else {
                    await firstValueFrom(this.dataService.deleteMeetAccountGame(this.userData.id, this.meetData.id, game.id))
                }
            }
        }

        // update the original copy for future comparisons
        this.meetDataCopyOriginal.playedGames = [...this.meetData.playedGames]
    }
}
